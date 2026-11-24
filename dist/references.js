// Editorial reference labels and example sentences. MiniLM measures their vectors.
(() => {
  'use strict';

  const topics = [
    {
      id: "live", label: "Live music", color: "#ac97f4",
      anchors: "gig audience stage band encore festival tickets stadium performance applause crowd venue performer rock show pop singer tour dancer music live played",
      terms: "booked bow cheer concert ended evening fans headline lead opened out outside packed player printed sold song thousands waited",
      sentences: [
        "The band walked onto the stage for a sold out concert as the stadium crowd cheered.",
        "Thousands of fans bought tickets to the concert and filled the stadium for the live performance.",
        "After the last song the concert audience called the band back on stage for an encore.",
        "The festival booked a live concert with a headline band and sold tickets at the gate.",
        "The live gig drew a cheering audience while the band played its encore on the outdoor stage.",
        "Fans waved their concert tickets and sang along with the band in the packed stadium.",
        "The singer opened the concert with a song and the crowd responded with a roar of applause.",
        "A sold out stadium gig brings the band close to an audience of thousands of fans.",
        "The crowd called for another encore after the headline performance at the summer festival.",
        "The festival audience lined up outside the venue for tickets to the evening gig.",
        "At the venue the live concert ended with applause and a final encore from the band.",
        "For the rock concert the singer asked the packed crowd to sing the final song.",
        "The rock band played a late gig on the festival stage to an audience of cheering fans.",
        "The show ended with the crowd on its feet and the singer taking a bow on stage.",
        "The concert promoter booked the venue and printed tickets for every show on the tour.",
        "After the stadium show the audience waited outside the venue to meet the band.",
        "The lead singer played guitar while the drummer and the bass player kept the beat on stage.",
      ],
    },
    {
      id: "classical", label: "Classical music", color: "#86adf8",
      anchors: "orchestra symphony conductor quartet violin soloist recital strings ensemble tuning piano oboe viola cello flute chamber classical soprano pianist score",
      terms: "concerto followed full instrument lower movement note reference rehearsal",
      sentences: [
        "The orchestra performed a symphony at the evening concert while the conductor followed the score.",
        "For the classical concert the conductor rehearsed a symphony with the strings and woodwinds.",
        "The chamber concert featured a string quartet with two violins, a viola and a cello.",
        "The soloist played a violin concerto at the concert accompanied by the full orchestra.",
        "The orchestra tuned to concert pitch before the conductor raised the baton for the symphony.",
        "The oboe sounded a tuning note and the strings adjusted each instrument to concert pitch.",
        "The violin soloist prepared for the chamber recital by rehearsing scales with the pianist.",
        "The string quartet closed the classical concert with a slow movement for violin and cello.",
        "At the rehearsal the conductor asked the orchestra to repeat the opening of the symphony.",
        "The ensemble tuned each instrument to the same reference pitch before the chamber rehearsal.",
        "A tuning fork gives a reference frequency for the concert pitch used by the ensemble.",
        "The oboe and violin each played a tuning note while the conductor listened to the pitch.",
        "The double bass joined the cello and viola in the lower strings of the orchestra.",
        "The bass player followed the conductor through the quiet movement of the chamber symphony.",
        "The pianist and soloist took a bow after the audience applauded their chamber recital.",
        "At a recital a soloist can perform a concerto with piano instead of a full orchestra.",
        "The quartet played from a score in the hall as the audience settled before the concert.",
      ],
    },
    {
      id: "sound", label: "Sound production", color: "#e09cae",
      anchors: "reverb microphone mix amplifier recording echo acoustics sound frequency studio audio speaker track loudness synthesizer rhythm melody microtonality room hall",
      terms: "added adjusted captured changed clear engineer guitar long noise producer soundcheck stereo tested tone vocal",
      sentences: [
        "To mix the concert recording the engineer balanced the microphones against the crowd noise.",
        "The engineer captured the sound of a live concert with room microphones and a stereo recorder.",
        "For a concert hall sound the producer added long reverb and a little echo to the mix.",
        "A microphone placed near the amplifier picked up the bass guitar at the concert soundcheck.",
        "The sound engineer tested the microphone and the amplifier during the concert soundcheck.",
        "A wide stereo mix with room reverb and crowd noise made the recording sound like a concert.",
        "The room acoustics gave the live recording a long echo even before the producer added reverb.",
        "During soundcheck the engineer turned the bass down in the mix and raised the vocal microphone.",
        "A recording of the concert hall preserves the echo and natural reverb of the room.",
        "The producer mixed the bass guitar with the kick drum to fill the low frequency range.",
        "The amplifier sent the bass through a speaker while a microphone captured the guitar tone.",
        "The bass player adjusted the amplifier to give the bass guitar a deeper sound.",
        "The engineer used a microphone and a pair of headphones to check the stereo recording.",
        "The synthesizer changed the pitch by raising the frequency of the electronic tone.",
        "The producer adjusted the pitch of a vocal sample until its frequency matched the reference note.",
        "Reducing reverb in the mix helped the vocal recording sound clear over the crowd noise.",
        "The hall acoustics shaped the sound of the strings and the length of the reverb.",
      ],
    },
    {
      id: "cooperation", label: "Coordination", color: "#75cdbc",
      anchors: "cooperation coordination jointly alliance teamwork partners agreement effort together collaboration committee mission team volunteers plan partnership collective act work",
      terms: "action agency agree charity close coordinate council department emergency joint members organize relief resources response responsibility share shared supplies volunteer",
      sentences: [
        "The two teams acted in concert to coordinate their joint effort and share responsibility.",
        "The charities worked in concert on the relief effort, pooling supplies and coordinating volunteers.",
        "The agencies acted in concert under a joint agreement to coordinate the emergency response.",
        "The partners worked together in concert and reached an agreement through close cooperation.",
        "The departments acted in concert to coordinate a joint response and share their resources.",
        "The alliance brought its members together to align their actions and pursue a shared goal.",
        "The partners planned the relief effort jointly and agreed to coordinate their teams.",
        "The teams agreed to work in concert, combining their resources through teamwork and cooperation.",
        "The charities acted jointly in close coordination to organize volunteers and deliver relief.",
        "The committee and the council worked in concert through a formal agreement on shared responsibility.",
        "Working together in concert allowed the agencies to organize supplies for the emergency response.",
        "The council described the alliance as a collaboration based on mutual agreement and cooperation.",
        "The departments carried out the plan jointly, using teamwork to coordinate actions across both teams.",
        "Cooperation among the partners made the joint relief effort easier to organize and sustain.",
        "Coordination between the agencies improved when the partners agreed to share their resources.",
        "Organizers depended on teamwork and collaboration to bring members of the alliance together.",
        "The groups acted together and made decisions jointly to keep the partnership in concert.",
      ],
    },
    {
      id: "finance", label: "Finance", color: "#83c9f2",
      anchors: "loan credit savings deposit account mortgage interest lender banking funds equity debt money stocks",
      terms: "balance bank borrower cash explained history home monthly payment rate reduce repayment small statement",
      sentences: [
        "The bank approved a home loan after checking her credit history and savings account.",
        "A regular cash deposit helped the bank customer grow the balance in his savings account.",
        "The lender explained how interest on the bank loan changed the monthly mortgage payment.",
        "The bank reviewed the mortgage application and credit report before offering a lower interest rate.",
        "She visited the bank to deposit her paycheck and transfer savings into a joint account.",
        "The borrower asked the lender to extend the loan and reduce the monthly interest payment.",
        "A bank teller counted the cash deposit and printed a receipt with the new account balance.",
        "The credit union offered a small business loan after reviewing cash flow and repayment history.",
        "A mortgage lender checks income and credit before calculating the interest rate on a loan.",
        "The bank paid interest on the savings deposit and mailed a statement showing the account balance.",
        "The bank froze the credit card after the customer spotted a charge on her monthly statement.",
        "A lender can refinance a mortgage when the borrower has savings and a steady repayment record.",
      ],
    },
    {
      id: "river", label: "Rivers & fishing", color: "#57c6b2",
      anchors: "river water current shore fishing fish stream reeds trout salmon pond lake flood coast shoreline",
      terms: "along angler bass carried left mud watched",
      sentences: [
        "From the river bank the angler cast a fishing line past the reeds into the current.",
        "A bass hid beside the river bank where shallow water flowed under a fallen willow.",
        "The stream spilled over its bank and carried mud from the shore into the river.",
        "The fishing guide found bass in deep water downstream from the bend in the river.",
        "Rain swelled the current until water crept up the river bank and flooded the reeds.",
        "A bass struck the fishing lure as the angler pulled it along the rocky shore.",
        "The river current carried a school of fish past a sand bar near the bank.",
        "Under the reeds along the shore a bass waited for small fish in the stream.",
        "The anglers followed the river bank upstream to fish for bass in the clear water.",
        "A fishing boat drifted with the current while a heron hunted fish near the shore.",
        "The stream cut a channel through the mud and left stones along the water edge.",
        "The angler released the bass and watched the fish swim back into the river current.",
      ],
    },
    {
      id: "baseball", label: "Baseball", color: "#eac478",
      anchors: "pitcher batter ball catcher strike inning fastball glove dugout mound baseball runner athlete",
      terms: "bat pitch plate",
      sentences: [
        "The pitcher threw a fastball and the batter swung the bat at the first pitch.",
        "The catcher caught the pitch in his glove and the umpire called a strike.",
        "The batter gripped the wooden bat and sent the next pitch into left field.",
        "In the final inning the pitcher fired a fastball past the batter for a strike.",
        "The catcher signaled for a curveball and the pitcher bounced the ball near home plate.",
        "A foul ball glanced off the bat and landed behind the catcher during the inning.",
        "The batter watched the pitch miss the strike zone and dropped the bat to walk.",
        "The pitcher rubbed the ball inside his glove before choosing a fastball for the next pitch.",
        "The runner stole second base when the catcher scrambled after a wild pitch in the dirt.",
        "The batter cracked the bat on a fastball and sent the ball past the first baseman.",
        "The pitcher started the inning with a strike and ended it with a ground ball.",
        "The catcher steadied his glove as the batter waited at the plate for the final pitch.",
      ],
    },
    {
      id: "business", label: "Business pitches", color: "#c9a1ef",
      anchors: "investor startup proposal funding customer sales market product company enterprise venture client",
      terms: "founder research",
      sentences: [
        "The startup founder rehearsed a pitch for an investor who might fund the new product.",
        "The sales team tailored its pitch to a customer who wanted a simpler billing product.",
        "The investor studied the startup proposal and asked how much funding would cover the first year.",
        "A clear pitch explained the target market and showed the customer testing the new product.",
        "The founder shortened the pitch deck and added sales figures requested by the lead investor.",
        "The startup secured funding after a product demo convinced an investor of strong customer demand.",
        "The sales manager rewrote the proposal after hearing the customer describe a gap in the market.",
        "A startup team tested its product with one customer before asking for more funding.",
        "The investor liked the market research but asked the founder to revise the funding proposal.",
        "The sales pitch focused on how the product would help the customer reduce shipping costs.",
        "The founder opened the investor pitch with a customer story and a forecast of annual sales.",
        "The startup prepared a new proposal when market research suggested another round of funding.",
      ],
    },
  ];

  const generalTopics = [
    {id: "people", label: "People & places", color: "#75cdbc", anchors: "teacher doctor neighbor parent family child artist friend citizen city village community"},
    {id: "science", label: "Science & technology", color: "#86adf8", anchors: "light energy gravity space atom biology chemistry computer software machine engine science"},
    {id: "nature", label: "Nature & wildlife", color: "#9dbf79", anchors: "forest mountain ocean tree bird desert whale flower spring weather soil animal"},
    {id: "daily", label: "Everyday life", color: "#eab182", anchors: "kitchen food garden house street train clothing table chair bread coffee travel"},
    {id: "culture", label: "Arts & expression", color: "#ac97f4", anchors: "art dance painting story poetry book film sculpture drama language museum color"},
    {id: "services", label: "Work & services", color: "#d799b7", anchors: "service hospital transport education law trade hotel delivery office industry career labor"},
  ];

  const topicPanels = {
    concert: "live crowd act work band played sound audience strings agreement tickets encore stage mix stadium applause recording room score effort partners hall cooperation jointly quartet orchestra reverb microphone classical together violin conductor coordination symphony tuning teamwork echo acoustics amplifier ensemble",
    pitch: "tuning instrument reference glove batter ensemble frequency catcher sales strike bat adjusted product fastball pitcher customer founder plate ball investor inning conductor startup market vocal symphony funding strings violin orchestra proposal research soloist mix sound amplifier microphone acoustics reverb recording",
    bass: "guitar amplifier angler player water river fish fishing soundcheck microphone current reeds shore followed along sound stream mix lead movement frequency strings symphony conductor orchestra recording quartet stage crowd violin reverb tuning acoustics audience ensemble band applause encore stadium gig",
  };

  // Each row pairs a context label and sentence with its landmark words.
  // Concert, pitch and bass keep the shared topic panels above.
  const featuredExamples = {
    concert: [
      ["Live show", "The band returned to the stadium stage for an encore at the concert."],
      ["Classical", "The conductor rehearsed the orchestra for a classical concert."],
      ["In concert", "The two agencies worked in concert to coordinate their joint relief effort."],
      ["Sound production", "The producer added room reverb and crowd noise to the concert recording."],
      ["Concert pitch", "The oboe played a reference note as the strings tuned to concert pitch."],
    ],
    pitch: [
      ["Tuning", "The orchestra used a reference frequency to tune to concert pitch."],
      ["Baseball", "The catcher caught the pitch as the batter missed the ball."],
      ["Business", "The startup founder rehearsed a sales pitch for an investor."],
    ],
    bass: [
      ["Bass guitar", "The engineer adjusted the amplifier and turned up the bass guitar in the mix."],
      ["Fishing", "The angler caught a bass in the river near the reeds."],
      ["Orchestra", "The double bass joined the cello in the orchestra."],
    ],
    bank: [
      ["Finance", "The bank approved a mortgage after checking the credit report.", "savings deposit loan lender mortgage credit account cash interest"],
      ["River", "The angler cast a fishing line from the river bank into the current.", "river shore stream reeds current mud angler water"],
      ["Aircraft turn", "The pilot tilted the wings to bank the plane around the ridge.", "tilt wing turn pilot aircraft roll aviation"],
      ["Reserve supply", "The seed bank stores rare varieties in cold vaults for future harvests.", "reserve collection storage vault archive seeds supply"],
    ],
    bark: [
      ["Tree covering", "Deep grooves in the bark of the oak sheltered a colony of ants.", "trunk timber rind cork wood birch"],
      ["Dog call", "One sharp bark from the terrier woke everyone in the house.", "dog woof yelp growl howl kennel"],
      ["Chocolate candy", "We broke the peppermint bark into shards after the chocolate set.", "chocolate candy mint confection almond brittle"],
    ],
    case: [
      ["Courtroom", "The jury heard the last witness in the case before breaking for lunch.", "jury lawsuit verdict lawyer testimony judge"],
      ["Protective cover", "She tucked the violin into its padded case and snapped the latches shut.", "container padding luggage lid latch shell"],
      ["Grammar", "In Latin, the ending of a noun often tells you its grammatical case.", "nominative accusative genitive declension noun inflection"],
      ["Medicine", "The nurse reported a new case of measles at the school.", "patient illness outbreak diagnosis symptom infection"],
    ],
    cell: [
      ["Biology", "Under the microscope, a single cell divided into two.", "nucleus membrane tissue organism division cytoplasm"],
      ["Prison", "The guard unlocked the cell and led the prisoner into the yard.", "prison bars inmate jail confinement bunk"],
      ["Spreadsheet", "Enter the total in the cell beneath the last invoice amount.", "spreadsheet row column formula table grid"],
      ["Electric power", "One rechargeable cell powers the small clock on the shelf.", "battery electrode voltage charge lithium electricity"],
    ],
    court: [
      ["Law", "The court heard both lawyers before issuing its ruling.", "judge hearing jury verdict appeal tribunal"],
      ["Basketball", "The players sprinted down the court for an easy layup.", "hoop dribble basket hardwood sideline rebound"],
      ["Royal household", "Musicians at the royal court played while the queen received her guests.", "palace monarch nobles throne queen courtiers"],
      ["Attracting a mate", "The male peacock spreads his tail to court a nearby female.", "courtship mating display feathers plumage peacock"],
    ],
    crane: [
      ["Wading bird", "A sandhill crane stepped through the marsh on long legs.", "bird heron marsh feathers beak migration"],
      ["Construction", "A tower crane lifted the steel beam onto the unfinished roof.", "hoist cable pulley boom rigging construction"],
      ["Stretch to see", "From the back row, I had to crane my neck to see the stage.", "stretch neck lean peer gaze tiptoe"],
    ],
    current: [
      ["Water flow", "The canoe drifted downstream as the current carried it past the bridge.", "river tide stream flow eddy channel"],
      ["Electricity", "Closing the switch lets the current pass through the wire.", "ampere voltage electron circuit wire battery"],
      ["Present time", "The current timetable includes a later train on Friday evenings.", "present latest today recent ongoing contemporary"],
    ],
    draft: [
      ["Writing", "The editor returned the first draft with a question penciled into the margin.", "manuscript editor revision paragraph outline margin"],
      ["Cold air", "A cold draft under the door made the candle flicker.", "breeze doorway chill window curtain wind"],
      ["Team selection", "The rookie waited through two rounds of the draft before a team called her name.", "rookie league prospect roster athlete selection"],
      ["Boat depth", "The ferry's shallow draft lets it cross the sandbar at low tide.", "hull keel depth waterline harbor sandbar"],
    ],
    field: [
      ["Farmland", "The farmer sowed barley in the field beyond the barn.", "farm crop pasture acreage plow harvest"],
      ["Physics", "Iron filings traced the magnetic field around the horseshoe magnet.", "magnet force flux charge electric strength"],
      ["Area of study", "Her early research helped establish the field of marine archaeology.", "discipline specialty expertise research scholarship profession"],
      ["Baseball", "The shortstop ran forward to field the slowly rolling ball.", "catch glove shortstop grounder infield throw"],
    ],
    key: [
      ["Door lock", "The brass key turned in the lock and the cellar door swung open.", "lock door bolt locksmith tumbler brass"],
      ["Music", "The singer asked the pianist to play the song in a lower key.", "tonic scale chord harmony melody pitch"],
      ["Map symbols", "The map key showed that a dotted blue line meant a seasonal stream.", "legend symbol cartography map contour compass"],
      ["Encryption", "Only the recipient's private key could decrypt the message.", "encryption cipher decryption secret cryptography plaintext"],
    ],
    light: [
      ["Illumination", "A narrow beam of light swept across the dark stage.", "photon glow beam lamp illumination radiance"],
      ["Low weight", "The suitcase felt light enough to lift with one finger.", "weight feather airy buoyant load heft"],
      ["Pale color", "She mixed white paint into the blue until it was a light shade.", "pale pastel tint cream ivory beige"],
      ["Ignite", "He used a match to light the candle before dinner.", "ignite kindle flame spark match wick"],
    ],
    match: [
      ["Sports", "The tennis match ended when the final serve clipped the line.", "tennis tournament opponent scoreboard serve stadium"],
      ["Fire", "She struck a match against the box and lit the birthday candle.", "flame striker spark candle tinder smoke"],
      ["Color pairing", "The tailor held the swatch beside the coat to check for a color match.", "swatch shade fabric hue dye palette"],
      ["Donation", "A local donor promised to match every dollar raised by the food bank.", "donation fundraiser charity pledge gift contribution"],
    ],
    press: [
      ["Journalism", "The mayor answered questions from the press outside city hall.", "reporter journalist newspaper interview headline newsroom"],
      ["Olive oil", "At the mill, a heavy press squeezed oil from the crushed olives.", "mill oil pulp squeeze extraction olive"],
      ["Weightlifting", "For the overhead press, Maya lifted the barbell from her shoulders until her arms were straight.", "barbell shoulders gym strength dumbbell repetition"],
      ["Basketball", "The coach called for a full-court press to force a turnover.", "defense basketball guard trap opponent turnover"],
    ],
    root: [
      ["Plant anatomy", "A thick root from the maple had lifted the garden path.", "tree soil taproot seedling stem tuber"],
      ["Mathematics", "The positive square root of eighty-one is nine.", "square equation radical exponent algebra polynomial"],
      ["Word origin", "The Latin root of the word portable means to carry.", "etymology lexicon prefix suffix morpheme latin"],
      ["Cheering", "Both sisters root for the visiting team whenever it comes to town.", "cheer support fan stadium chant applause"],
    ],
    scale: [
      ["Weighing", "The baker set the mixing bowl on the scale and added flour.", "weight balance grams kilograms mass measure"],
      ["Music", "The pianist played a rising scale before beginning the sonata.", "octave notes pitch melody mode piano"],
      ["Animal covering", "A single silvery scale clung to the net after the fish slipped away.", "fish flake skin reptile armor carp"],
      ["Map ratio", "At this map's scale, one centimeter represents a kilometer on the trail.", "map ratio distance model proportion blueprint"],
    ],
    shell: [
      ["Animal covering", "The turtle pulled its head inside its shell when the heron landed.", "turtle tortoise armor carapace snail protection"],
      ["Command line", "I opened a shell and typed a command to list the files.", "terminal command prompt console script interpreter"],
      ["Remove a covering", "We sat on the back steps to shell peas for supper.", "peel husk shuck pod peas beans"],
      ["Building exterior", "Only the brick shell of the old theater remained after the fire.", "facade exterior masonry walls structure frame"],
    ],
    sound: [
      ["Hearing", "The sound of the train whistle carried across the valley.", "noise echo hearing vibration ear acoustics"],
      ["Solid condition", "The surveyor found the bridge foundations structurally sound despite their age.", "sturdy stable reliable strong intact secure"],
      ["Coastal waters", "The ferry crossed the sheltered sound between the island and the mainland.", "inlet strait waterway channel coast bay"],
      ["Measure depth", "The crew lowered a weighted line to sound the depth of the harbor.", "depth leadline sounding seabed fathom plumb"],
    ],
    space: [
      ["Astronomy", "The probe traveled through space for years before it reached Jupiter.", "orbit vacuum planet galaxy spacecraft cosmos"],
      ["Available room", "We moved the sofa to make space for a second bookcase.", "room clearance furniture storage floor shelf"],
      ["Typography", "Place a space between the two words so that the caption is easy to read.", "whitespace typography letter keyboard text gap"],
      ["Personal boundary", "After the argument, Amira asked for some space to think things over.", "privacy solitude distance boundary independence quiet"],
    ],
    spring: [
      ["Season", "By early spring, crocuses were pushing through the last patches of snow.", "season thaw blossom tulip april daffodil"],
      ["Metal coil", "A tiny spring beneath the key pushes it back up after each keystroke.", "coil steel tension elastic compression recoil"],
      ["Water source", "Cold water bubbled from a spring at the foot of the cliff.", "water source stream groundwater well pool"],
      ["Leap", "From the windowsill, the cat could spring onto the bookshelf in one leap.", "jump leap pounce bound vault bounce"],
    ],
    studio: [
      ["Recording", "The singer stepped into the studio to record the last vocal track.", "microphone mixing producer headphones booth vocals"],
      ["Visual art", "Wet canvases lined the walls of the painter's studio.", "easel canvas brush palette pigment sketch"],
      ["Apartment", "Her studio had just enough room for a bed beside the kitchenette.", "apartment rent kitchenette tenant flat housing"],
      ["Dance", "At the ballet studio, the dancers warmed up at the barre.", "ballet barre choreography rehearsal mirror dancer"],
    ],
    wave: [
      ["Ocean", "The surfer waited for a steep wave to lift the board toward shore.", "surf tide swell crest beach breaker"],
      ["Greeting", "Her grandfather greeted her with a wave from the station platform.", "greeting hand gesture farewell hello palm"],
      ["Radio", "The antenna picked up a radio wave from a distant transmitter.", "frequency signal wavelength antenna receiver transmitter"],
      ["Crowd", "The wave traveled around the stadium as each section stood and raised its arms.", "spectators stadium seats fans stands crowd"],
    ],
  };

  const senseColors = ["#ac97f4", "#68cdb5", "#86adf8", "#e59dca"];
  const featuredWords = Object.freeze(Object.keys(featuredExamples).sort());
  const groups = [...topics, ...generalTopics].map(({id, label, color}) => ({id, label, color}));
  const groupOf = new Map();
  const topicOf = new Map();
  for (const topic of topics) {
    for (const word of (topic.anchors + ' ' + topic.terms).trim().split(/\s+/)) {
      groupOf.set(word, topic.id);
      topicOf.set(word, topic);
    }
  }
  const generalWords = [];
  for (const topic of generalTopics) {
    for (const word of topic.anchors.split(' ')) {
      generalWords.push(word);
      groupOf.set(word, topic.id);
    }
  }
  const words = [...new Set([...featuredWords, ...groupOf.keys()])].sort();
  const normalize = word => String(word || '').trim().toLowerCase();

  function getPanel(input) {
    const word = normalize(input);
    const hasTopicPanel = Object.hasOwn(topicPanels, word);
    if (!hasTopicPanel && Object.hasOwn(featuredExamples, word)) {
      const groups = [];
      const points = [];
      featuredExamples[word].forEach(([label, , anchors], i) => {
        const id = word + '-' + i;
        groups.push({id, label, color: senseColors[i]});
        for (const anchor of anchors.split(' ')) points.push({word: anchor, group: id});
      });
      return {points, groups, general: false};
    }
    const topic = topicOf.get(word);
    const general = !hasTopicPanel && !topic;
    let labels = generalWords;
    if (hasTopicPanel) labels = topicPanels[word].split(' ');
    else if (topic) labels = topic.anchors.split(' ');
    const points = labels.filter(label => label !== word).map(label => ({word:label, group:groupOf.get(label)}));
    const present = new Set(points.map(point => point.group));
    return {points, groups:groups.filter(group => present.has(group.id)), general};
  }

  // Only whole-word occurrences can be selected by the model's token inspector.
  const exampleIndex = new Map();
  for (const topic of topics) {
    const seen = new Set();
    for (const sentence of topic.sentences) {
      for (const word of sentence.toLowerCase().match(/[a-z]+/g) || []) {
        if (seen.has(word) || !groupOf.has(word)) continue;
        seen.add(word);
        if (!exampleIndex.has(word)) exampleIndex.set(word, []);
        exampleIndex.get(word).push({label:topic.label, sentence});
      }
    }
  }
  function examples(input) {
    const word = normalize(input);
    if (Object.hasOwn(featuredExamples, word)) {
      return featuredExamples[word].map(([label, sentence, anchors], i) =>
        anchors ? {label, sentence, color: senseColors[i]} : {label, sentence}
      );
    }
    return exampleIndex.get(word) || [];
  }

  globalThis.AtlasReference = Object.freeze({getPanel, examples, featuredWords, groups, words});
})();
