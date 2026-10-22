(function () {
  var COCO_URL = 'https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/model.json';
  var MNET_URL = 'https://tfhub.dev/google/imagenet/mobilenet_v2_050_224/classification/2/model.json?tfjs-format=file';
  var COCO_DB = 'indexeddb://vetid-coco-v1';
  var MNET_DB = 'indexeddb://vetid-mnet-v1';

  var DOG_RANGE = [151, 268];
  var CAT_RANGE = [281, 285];
  var OTHER_ANIMALS = ['bird', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'teddy bear'];

  var coco = null;
  var mnet = null;
  var progress = { coco: 0, mnet: 0 };
  var busy = false;

  function post(msg) {
    var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else window.dispatchEvent(new CustomEvent('vetid', { detail: msg }));
  }

  function report(stage) {
    post({ type: 'progress', stage: stage, value: progress.coco * 0.7 + progress.mnet * 0.3 });
  }

  async function loadCached(loader, dbUrl, remoteUrl, key) {
    try {
      var cached = await loader(dbUrl);
      progress[key] = 1;
      report('cache');
      return { model: cached, cached: true };
    } catch (e) {}
    var model = await loader(
      tf.io.browserHTTPRequest(remoteUrl, {
        onProgress: function (p) {
          progress[key] = p;
          report('download');
        },
      })
    );
    progress[key] = 1;
    report('download');
    return { model: model, cached: false };
  }

  async function init() {
    try {
      try {
        await tf.setBackend('webgl');
      } catch (e) {
        await tf.setBackend('cpu');
      }
      await tf.ready();
      report('init');

      var c = await loadCached(
        function (u) { return cocoSsd.load({ base: 'lite_mobilenet_v2', modelUrl: u }); },
        COCO_DB, COCO_URL, 'coco'
      );
      coco = c.model;
      if (!c.cached) coco.model.save(COCO_DB).catch(function () {});

      var m = await loadCached(
        function (u) { return mobilenet.load({ version: 2, alpha: 0.5, modelUrl: u, inputRange: [0, 1] }); },
        MNET_DB, MNET_URL, 'mnet'
      );
      mnet = m.model;
      if (!m.cached) mnet.model.save(MNET_DB).catch(function () {});

      post({ type: 'ready', backend: tf.getBackend(), cached: c.cached && m.cached });
    } catch (e) {
      post({ type: 'error', message: String((e && e.message) || e) });
    }
  }

  function sumRange(probs, range) {
    var s = 0;
    for (var i = range[0]; i <= range[1]; i++) s += probs[i];
    return s;
  }

  function bestInRange(probs, range) {
    var index = range[0];
    var score = probs[range[0]] || 0;
    for (var i = range[0] + 1; i <= range[1]; i++) {
      if (probs[i] > score) {
        score = probs[i];
        index = i;
      }
    }
    var name = BREEDS[index];
    if (!name || score < 0.08) return null;
    return { name: name, score: score };
  }

  async function classify(id, base64) {
    var t0 = performance.now();
    var img = new Image();
    img.src = 'data:image/jpeg;base64,' + base64;
    await img.decode();
    var W = img.naturalWidth;
    var H = img.naturalHeight;

    var dets = await coco.detect(img, 12, 0.3);

    var probsT = tf.tidy(function () { return tf.softmax(mnet.infer(img)); });
    var probs = await probsT.data();
    probsT.dispose();
    var dogP = sumRange(probs, DOG_RANGE);
    var catP = sumRange(probs, CAT_RANGE);

    var best = { person: 0, cat: 0, dog: 0, other: 0 };
    var detections = [];
    dets.forEach(function (d) {
      var key = d.class === 'person' ? 'person'
        : d.class === 'cat' ? 'cat'
        : d.class === 'dog' ? 'dog'
        : OTHER_ANIMALS.indexOf(d.class) >= 0 ? 'other'
        : null;
      if (!key) return;
      best[key] = Math.max(best[key], d.score);
      detections.push({
        label: key,
        name: d.class,
        score: d.score,
        box: [d.bbox[0] / W, d.bbox[1] / H, d.bbox[2] / W, d.bbox[3] / H],
      });
    });

    var humanStrong = best.person >= 0.5;
    var catScore = Math.max(best.cat, humanStrong ? (catP >= 0.75 ? catP : 0) : catP);
    var dogScore = Math.max(best.dog, humanStrong ? (dogP >= 0.75 ? dogP : 0) : dogP);
    var scores = { human: best.person, cat: catScore, dog: dogScore, other: best.other };

    var animal = ['cat', 'dog', 'other'].sort(function (a, b) { return scores[b] - scores[a]; })[0];
    var verdict;
    if (scores[animal] >= 0.45) verdict = animal;
    else if (scores.human >= 0.45) verdict = 'human';
    else if (Math.max(scores[animal], scores.human) >= 0.3) verdict = scores[animal] >= scores.human ? animal : 'human';
    else verdict = 'unknown';

    var breed = null;
    if (verdict === 'cat') breed = bestInRange(probs, CAT_RANGE);
    else if (verdict === 'dog') breed = bestInRange(probs, DOG_RANGE);
    else if (verdict === 'other') {
      var otherDet = null;
      detections.forEach(function (d) {
        if (d.label === 'other' && (!otherDet || d.score > otherDet.score)) otherDet = d;
      });
      if (otherDet && OTHER_RU[otherDet.name]) breed = { name: OTHER_RU[otherDet.name], score: otherDet.score };
    }

    post({
      type: 'result',
      id: id,
      verdict: verdict,
      breed: breed,
      confidence: verdict === 'unknown' ? Math.max(scores[animal], scores.human) : scores[verdict],
      scores: scores,
      withHuman: verdict !== 'human' && verdict !== 'unknown' && best.person >= 0.5,
      detections: detections,
      ms: Math.round(performance.now() - t0),
      backend: tf.getBackend(),
    });
  }

  window.__vetidClassify = function (id, base64) {
    if (!coco || !mnet) {
      post({ type: 'error', id: id, message: 'Нейросеть ещё загружается' });
      return;
    }
    if (busy) return;
    busy = true;
    classify(id, base64)
      .catch(function (e) { post({ type: 'error', id: id, message: String((e && e.message) || e) }); })
      .then(function () { busy = false; });
  };

  init();
})();
