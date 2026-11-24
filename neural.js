// MiniLM inference and its paired WordPiece tokenizer run in the browser.
(() => {
  'use strict';

  const MODEL = 'Xenova/all-MiniLM-L6-v2';
  const REVISION = '751bff37182d3f1213fa05d7196b954e230abad9';
  const LIBRARY = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';
  const DIMENSIONS = 384;
  const MAX_TOKENS = 256;
  const BATCH = 12;
  const isolated = new Map();
  const projections = new Map();
  const loadingListeners = new Set();
  let loading;
  let vocabulary=[];
  let inferenceQueue = Promise.resolve();

  function progress(message, percent=null) {
    for (const listener of loadingListeners) listener(message, percent);
  }

  async function getExtractor(onProgress) {
    loadingListeners.add(onProgress);
    if (!loading) {
      loading = (async () => {
        progress('Starting the browser runtime…');
        const {pipeline, env} = await import(LIBRARY);
        env.allowLocalModels = false;
        // A single WASM thread also supports sites without cross-origin isolation.
        env.backends.onnx.wasm.numThreads = 1;
        progress('Loading the tokenizer and model files…');
        const extractor=await pipeline('feature-extraction', MODEL, {
          revision: REVISION,
          quantized: true,
          progress_callback(event) {
            if (!event.file?.endsWith('.onnx')) return;
            if (event.status === 'progress') {
              const knownSize=Number.isFinite(event.total) && event.total>0 &&
                Number.isFinite(event.loaded) && event.loaded>=0 && event.loaded<=event.total;
              const percent=knownSize ? Math.floor(100*event.loaded/event.total) : null;
              progress('Loading model weights…', percent);
            } else if (event.status === 'done') {
              progress('Initializing the word encoder…');
            }
          }
        });
        // Plain whole-word tokens supplement the examples in autocomplete.
        const vocab=extractor.tokenizer.model.vocab;
        if(Array.isArray(vocab))vocabulary=vocab.filter(token=>/^[a-z]+$/.test(token)).sort();
        return extractor;
      })().catch(error => {
        loading = null;
        throw new Error('The word encoder could not load. Check access to jsDelivr and Hugging Face, then try again.', {cause:error});
      });
    }
    try {
      return await loading;
    } finally {
      loadingListeners.delete(onProgress);
    }
  }

  function dot(a, b) {
    let result = 0;
    for (let i = 0; i < a.length; i++) result += a[i] * b[i];
    return result;
  }

  function norm(a) {
    return Math.sqrt(dot(a, a));
  }

  function unit(a) {
    const n = norm(a);
    if (n === 0) throw new Error('The encoder returned a zero vector.');
    return a.map(x => x / n);
  }

  function cosine(a, b) {
    // Input vectors are L2-normalized after pooling subword pieces.
    return Math.max(-1, Math.min(1, dot(a, b)));
  }

  function locateWord(word, sentence, occurrence) {
    if (!word || !Number.isInteger(occurrence) || occurrence < 0) {
      throw new Error('Choose a word and a valid occurrence.');
    }
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = sentence.matchAll(new RegExp('(^|[^\\p{L}\\p{M}\\p{N}_])(' + escaped + ')(?=$|[^\\p{L}\\p{M}\\p{N}_])', 'giu'));
    let index = 0;
    for (const match of matches) {
      if (index++ === occurrence) {
        const start = match.index + match[1].length;
        return [start, start + match[2].length];
      }
    }
    throw new Error('Include the focus word as a whole word in your sentence.');
  }

  function prepareInput(tokenizer, word, sentence, occurrence = 0) {
    const [start, end] = locateWord(word, sentence, occurrence);
    const encode = text => text ? tokenizer.encode(text, null, {add_special_tokens:false}) : [];
    const prefix = encode(sentence.slice(0, start));
    const ids = encode(sentence.slice(start, end));
    const sequence = tokenizer.encode(sentence);
    if (sequence.length > MAX_TOKENS) {
      throw new Error('Shorten this sentence to 256 WordPiece tokens, including the two boundary tokens.');
    }
    // BERT wraps every single input in [CLS] and [SEP]. Verify the span against the
    // full encoding to avoid selecting the wrong occurrence after punctuation.
    const offset = prefix.length + 1;
    if (!ids.length || !prefix.every((id, i) => sequence[i + 1] === id)
        || !ids.every((id, i) => sequence[offset + i] === id)) {
      throw new Error('The tokenizer could not align this focus word with its sentence.');
    }
    const pieces = tokenizer.model.convert_ids_to_tokens(ids);
    if (pieces.includes('[UNK]')) {
      throw new Error('The tokenizer could not recognize this word. Try another spelling.');
    }
    return {sentence, offset, pieces, ids, sequenceLength:sequence.length};
  }

  async function infer(extractor, items) {
    // ONNX sessions are shared. Serialize inference if two edits arrive close together.
    const job = inferenceQueue.then(async () => {
      const features = await extractor(items.map(item => item.sentence), {pooling:'none', normalize:false});
      const [batchCount, width, dimensions] = features.dims;
      if (dimensions !== DIMENSIONS || batchCount !== items.length) {
        throw new Error('The word encoder returned an unexpected token-state shape.');
      }
      return items.map((item, row) => {
        if (width < item.sequenceLength) throw new Error('The word encoder truncated the selected text.');
        const pooled = new Float64Array(dimensions);
        for (let piece = 0; piece < item.ids.length; piece++) {
          const offset = (row * width + item.offset + piece) * dimensions;
          for (let j = 0; j < dimensions; j++) pooled[j] += features.data[offset + j];
        }
        return unit(pooled.map(x => x / item.ids.length));
      });
    });
    inferenceQueue = job.catch(() => {});
    return job;
  }

  function orthogonalize(vector, axes) {
    for (const axis of axes) {
      const overlap = dot(vector, axis);
      for (let d = 0; d < vector.length; d++) vector[d] -= overlap * axis[d];
    }
    return vector;
  }

  // PCA of the length-normalized, mean-centered reference vectors only.
  // The queried sentence and its isolated word never participate in the fit.
  function fitPca(references) {
    const average = new Float64Array(DIMENSIONS);
    for (const vector of references) {
      for (let d = 0; d < DIMENSIONS; d++) average[d] += vector[d] / references.length;
    }
    const centered = references.map(vector => vector.map((x, i) => x - average[i]));
    const axes = [];
    for (let c = 0; c < 3; c++) {
      let axis = unit(Float64Array.from(average, (_, i) => Math.sin((i + 1) * (c + 1) * 0.72)));
      for (let n = 0; n < 80; n++) {
        let next = new Float64Array(DIMENSIONS);
        for (const vector of centered) {
          const weight = dot(vector, axis);
          for (let d = 0; d < DIMENSIONS; d++) next[d] += weight * vector[d];
        }
        next = orthogonalize(next, axes);
        const length = norm(next);
        if (length < 1e-10) {
          axis = new Float64Array(DIMENSIONS);
          break;
        }
        next = next.map(x => x / length);
        const agreement = Math.abs(dot(axis, next));
        axis = next;
        if (1 - agreement < 1e-10) break;
      }
      let biggest = 0;
      for (let d = 1; d < DIMENSIONS; d++) {
        if (Math.abs(axis[d]) > Math.abs(axis[biggest])) biggest = d;
      }
      if (axis[biggest] < 0) axis = axis.map(x => -x);
      axes.push(axis);
    }
    let maxExtent = 1e-8;
    for (const vector of centered) {
      for (const axis of axes) maxExtent = Math.max(maxExtent, Math.abs(dot(vector, axis)));
    }
    const scale = 0.92 / maxExtent;
    return vector => {
      const offset = vector.map((x, i) => x - average[i]);
      const [x,y,z] = axes.map(axis => dot(offset, axis) * scale);
      return {x,y,z};
    };
  }

  async function getScene(word, sentence, referencePanel, onProgress = () => {}, options = {}) {
    word = String(word || '').trim().toLowerCase();
    sentence = String(sentence || '').trim();
    const occurrence = options.occurrence ?? 0;
    const text = sentence || word;
    locateWord(word, text, occurrence);
    const anchorMap = new Map((referencePanel?.points || []).filter(p => p.word !== word).map(p => [p.word,p]));
    const keys = Array.from(anchorMap.keys()).sort();
    if (keys.length < 3) throw new Error('Choose at least three reference words for this map.');
    const check = () => {
      if (options.signal?.aborted) throw new DOMException('This measurement was canceled.', 'AbortError');
    };
    check();
    const extractor = await getExtractor(onProgress);
    check();
    const targetInput = prepareInput(extractor.tokenizer, word, text, occurrence);
    const missing = [...keys,word].filter(name => !isolated.has(name));
    for (let first = 0; first < missing.length; first += BATCH) {
      check();
      onProgress('Measuring reference words · ' + (first + 1) + '–' + Math.min(missing.length, first + BATCH) + ' of ' + missing.length);
      const names = missing.slice(first, first + BATCH);
      const items = names.map(name => prepareInput(extractor.tokenizer, name, name));
      const vectors = await infer(extractor, items);
      names.forEach((name, i) => isolated.set(name, vectors[i]));
    }
    check();
    onProgress('Measuring the selected word…');
    const baseVector = isolated.get(word);
    const vector = sentence ? (await infer(extractor, [targetInput]))[0] : baseVector;
    check();
    const key = JSON.stringify(keys);
    if (!projections.has(key)) {
      if (projections.size >= 24) projections.delete(projections.keys().next().value);
      projections.set(key, fitPca(keys.map(name => isolated.get(name))));
    }
    const project = projections.get(key);
    const points = [...anchorMap.values()].map(p => {
      const ref = isolated.get(p.word);
      return {word:p.word, group:p.group, ...project(ref), score:cosine(vector,ref), baseScore:cosine(baseVector,ref)};
    });
    const rankings = [...points].sort((a,b) => b.score - a.score || a.word.localeCompare(b.word));
    return {
      word, sentence, points, target:{word, ...project(vector)}, base:{word, ...project(baseVector)},
      vector:Array.from(vector), baseVector:Array.from(baseVector), contextSimilarity:cosine(vector,baseVector),
      rankings, dimension:DIMENSIONS, groups:referencePanel.groups,
      contextApplied:Boolean(sentence), tokens:targetInput.pieces, tokenIds:targetInput.ids,
      candidateCount:keys.length, model:MODEL, revision:REVISION
    };
  }

  function suggest(prefix) {
    const found=[];
    for(const word of vocabulary){
      if(word.startsWith(prefix))found.push(word);
      if(found.length===7)break;
    }
    return found;
  }
  globalThis.AtlasNeural = Object.freeze({getScene, suggest, model:MODEL, dimension:DIMENSIONS, revision:REVISION});
})();
