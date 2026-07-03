/* ==========================================================================
   DOZIA — Scène 3D du héro (Three.js)
   Oreiller procédural à structure alvéolaire, rotation souris,
   particules d'air, vues multiples. Repli automatique sur l'image
   si WebGL n'est pas disponible.
   ========================================================================== */
(function () {
  'use strict';

  var conteneur = document.getElementById('scene-3d');
  if (!conteneur || typeof THREE === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var largeur = conteneur.clientWidth;
  var hauteur = conteneur.clientHeight;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return; /* WebGL indisponible : l'image de secours reste affichée */
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(largeur, hauteur);
  renderer.outputEncoding = THREE.sRGBEncoding;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(34, largeur / hauteur, 0.1, 100);

  /* --- Lumières --- */
  scene.add(new THREE.AmbientLight(0xf3edff, 0.75));
  var lumierePrincipale = new THREE.DirectionalLight(0xffffff, 0.95);
  lumierePrincipale.position.set(6, 10, 7);
  scene.add(lumierePrincipale);
  var lumiereViolette = new THREE.DirectionalLight(0xb99df0, 0.5);
  lumiereViolette.position.set(-7, 4, -6);
  scene.add(lumiereViolette);
  var lumiereBasse = new THREE.PointLight(0xd8c8f7, 0.5, 30);
  lumiereBasse.position.set(0, -4, 5);
  scene.add(lumiereBasse);

  var groupe = new THREE.Group();
  scene.add(groupe);

  /* --- Profil ergonomique de l'oreiller --- */
  var LARGEUR_O = 9.6, PROFONDEUR_O = 6.4;
  function hauteurCellule(x, z) {
    var nx = x / (LARGEUR_O / 2);   /* -1 .. 1 */
    var nz = z / (PROFONDEUR_O / 2);
    var bord = Math.pow(Math.max(0, 1 - nx * nx * 0.55 - nz * nz * 0.55), 0.5);
    var vague = 0.55 + 0.45 * Math.cos(nz * Math.PI);        /* creux cervical au centre */
    var pente = 1 + 0.16 * nz;                                 /* double hauteur avant/arrière */
    return (0.8 + 1.3 * bord * (0.55 + 0.45 * vague) * pente);
  }

  /* --- Cellules hexagonales (tubes ouverts instanciés) --- */
  var RAYON = 0.42, PAS_X = RAYON * 1.8, PAS_Z = RAYON * 1.56;
  var positions = [];
  for (var gz = -9; gz <= 9; gz++) {
    for (var gx = -14; gx <= 14; gx++) {
      var x = gx * PAS_X + (gz % 2 ? PAS_X / 2 : 0);
      var z = gz * PAS_Z;
      var ex = x / (LARGEUR_O / 2), ez = z / (PROFONDEUR_O / 2);
      if (ex * ex + ez * ez * 0.92 <= 1.02 && Math.abs(x) <= LARGEUR_O / 2 && Math.abs(z) <= PROFONDEUR_O / 2) {
        positions.push({ x: x, z: z, h: hauteurCellule(x, z) });
      }
    }
  }

  var geometrieCellule = new THREE.CylinderGeometry(RAYON, RAYON * 0.94, 1, 6, 1, true);
  var materiauCellule = new THREE.MeshPhysicalMaterial({
    color: 0x9273d6,
    roughness: 0.42,
    metalness: 0.02,
    clearcoat: 0.35,
    clearcoatRoughness: 0.5,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.97
  });
  var cellules = new THREE.InstancedMesh(geometrieCellule, materiauCellule, positions.length);
  var manequin = new THREE.Object3D();
  function placerCellules(temps, ondulation) {
    for (var i = 0; i < positions.length; i++) {
      var p = positions[i];
      var h = p.h;
      if (ondulation) {
        h += 0.06 * Math.sin(temps * 1.4 + p.x * 0.9 + p.z * 1.3);
      }
      manequin.position.set(p.x, h / 2, p.z);
      manequin.scale.set(1, h, 1);
      manequin.rotation.y = Math.PI / 6;
      manequin.updateMatrix();
      cellules.setMatrixAt(i, manequin.matrix);
    }
    cellules.instanceMatrix.needsUpdate = true;
  }
  placerCellules(0, false);
  groupe.add(cellules);

  /* --- Base de l'oreiller --- */
  var formeBase = new THREE.Shape();
  var rb = 1.6, bx = LARGEUR_O / 2 + 0.45, bz = PROFONDEUR_O / 2 + 0.45;
  formeBase.moveTo(-bx + rb, -bz);
  formeBase.lineTo(bx - rb, -bz);
  formeBase.quadraticCurveTo(bx, -bz, bx, -bz + rb);
  formeBase.lineTo(bx, bz - rb);
  formeBase.quadraticCurveTo(bx, bz, bx - rb, bz);
  formeBase.lineTo(-bx + rb, bz);
  formeBase.quadraticCurveTo(-bx, bz, -bx, bz - rb);
  formeBase.lineTo(-bx, -bz + rb);
  formeBase.quadraticCurveTo(-bx, -bz, -bx + rb, -bz);
  var geometrieBase = new THREE.ExtrudeGeometry(formeBase, { depth: 0.85, bevelEnabled: true, bevelThickness: 0.22, bevelSize: 0.22, bevelSegments: 3, curveSegments: 10 });
  geometrieBase.rotateX(-Math.PI / 2);
  var materiauBase = new THREE.MeshPhysicalMaterial({ color: 0x7d5ecf, roughness: 0.5, metalness: 0.03, clearcoat: 0.25 });
  var base = new THREE.Mesh(geometrieBase, materiauBase);
  base.position.y = -0.88;
  groupe.add(base);

  /* --- Ombre douce (texture dégradée sur un plan) --- */
  var canvasOmbre = document.createElement('canvas');
  canvasOmbre.width = canvasOmbre.height = 256;
  var ctx = canvasOmbre.getContext('2d');
  var degrade = ctx.createRadialGradient(128, 128, 20, 128, 128, 126);
  degrade.addColorStop(0, 'rgba(60,40,110,0.34)');
  degrade.addColorStop(1, 'rgba(60,40,110,0)');
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, 256, 256);
  var textureOmbre = new THREE.CanvasTexture(canvasOmbre);
  var ombre = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 11),
    new THREE.MeshBasicMaterial({ map: textureOmbre, transparent: true, depthWrite: false })
  );
  ombre.rotation.x = -Math.PI / 2;
  ombre.position.y = -1.15;
  scene.add(ombre);

  /* --- Particules d'air ascendantes --- */
  var NB_PARTICULES = 110;
  var geometrieAir = new THREE.BufferGeometry();
  var posAir = new Float32Array(NB_PARTICULES * 3);
  var vitesses = new Float32Array(NB_PARTICULES);
  for (var j = 0; j < NB_PARTICULES; j++) {
    posAir[j * 3] = (Math.random() - 0.5) * LARGEUR_O * 0.9;
    posAir[j * 3 + 1] = Math.random() * 4 - 1;
    posAir[j * 3 + 2] = (Math.random() - 0.5) * PROFONDEUR_O * 0.9;
    vitesses[j] = 0.008 + Math.random() * 0.018;
  }
  geometrieAir.setAttribute('position', new THREE.BufferAttribute(posAir, 3));
  var canvasPoint = document.createElement('canvas');
  canvasPoint.width = canvasPoint.height = 64;
  var ctxPoint = canvasPoint.getContext('2d');
  var degradePoint = ctxPoint.createRadialGradient(32, 32, 2, 32, 32, 30);
  degradePoint.addColorStop(0, 'rgba(255,255,255,0.95)');
  degradePoint.addColorStop(0.4, 'rgba(199,180,236,0.55)');
  degradePoint.addColorStop(1, 'rgba(199,180,236,0)');
  ctxPoint.fillStyle = degradePoint;
  ctxPoint.fillRect(0, 0, 64, 64);
  var materiauAir = new THREE.PointsMaterial({
    size: 0.28,
    map: new THREE.CanvasTexture(canvasPoint),
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  var air = new THREE.Points(geometrieAir, materiauAir);
  groupe.add(air);

  /* --- Vues --- */
  var VUES = {
    'trois-quarts': { pos: new THREE.Vector3(7.5, 6.2, 11.5), rotY: -0.35 },
    'dessus':       { pos: new THREE.Vector3(0.6, 13.5, 2.6),  rotY: 0 },
    'profil':       { pos: new THREE.Vector3(12.8, 2.4, 1.2),  rotY: 0 }
  };
  var vueCible = VUES['trois-quarts'];
  camera.position.copy(vueCible.pos);
  camera.lookAt(0, 0.6, 0);

  var controles = document.getElementById('scene-controles');
  if (controles) {
    controles.hidden = false;
    controles.addEventListener('click', function (e) {
      var bouton = e.target.closest('[data-vue]');
      if (!bouton) return;
      controles.querySelectorAll('button').forEach(function (b) { b.classList.remove('est-actif'); });
      bouton.classList.add('est-actif');
      vueCible = VUES[bouton.getAttribute('data-vue')] || VUES['trois-quarts'];
    });
  }

  /* --- Interaction souris / tactile --- */
  var rotationCibleY = -0.35, rotationCibleX = 0;
  var enTrainDeGlisser = false, dernierX = 0, dernierY = 0, tempsInactif = 0;
  conteneur.addEventListener('pointerdown', function (e) {
    enTrainDeGlisser = true;
    dernierX = e.clientX; dernierY = e.clientY;
    conteneur.setPointerCapture(e.pointerId);
  });
  conteneur.addEventListener('pointermove', function (e) {
    if (!enTrainDeGlisser) {
      var zone = conteneur.getBoundingClientRect();
      var nx = ((e.clientX - zone.left) / zone.width - 0.5) * 2;
      var ny = ((e.clientY - zone.top) / zone.height - 0.5) * 2;
      rotationCibleY = -0.35 + nx * 0.22;
      rotationCibleX = ny * 0.08;
      return;
    }
    rotationCibleY += (e.clientX - dernierX) * 0.008;
    rotationCibleX += (e.clientY - dernierY) * 0.004;
    rotationCibleX = Math.max(-0.4, Math.min(0.5, rotationCibleX));
    dernierX = e.clientX; dernierY = e.clientY;
    tempsInactif = 0;
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (type) {
    conteneur.addEventListener(type, function () { enTrainDeGlisser = false; });
  });

  /* --- Insertion dans la page --- */
  renderer.domElement.style.position = 'relative';
  renderer.domElement.style.zIndex = '2';
  conteneur.insertBefore(renderer.domElement, conteneur.firstChild);
  var imageSecours = document.getElementById('hero-secours');
  if (imageSecours) {
    imageSecours.style.transition = 'opacity 1s ease 0.2s';
    imageSecours.style.opacity = '0';
    setTimeout(function () { imageSecours.remove(); }, 1400);
  }

  /* Apparition cinématique */
  groupe.scale.set(0.86, 0.86, 0.86);
  groupe.position.y = -0.6;
  var progression = 0;

  /* --- Boucle de rendu (en pause hors écran) --- */
  var visible = true, ongletActif = !document.hidden;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entrees) {
      visible = entrees[0].isIntersecting;
    }, { threshold: 0.05 }).observe(conteneur);
  }
  document.addEventListener('visibilitychange', function () { ongletActif = !document.hidden; });

  var horloge = new THREE.Clock();
  function animer() {
    requestAnimationFrame(animer);
    if (!visible || !ongletActif) return;
    var dt = Math.min(horloge.getDelta(), 0.05);
    var t = horloge.elapsedTime;

    /* Entrée en douceur */
    if (progression < 1) {
      progression = Math.min(1, progression + dt * 0.7);
      var e = 1 - Math.pow(1 - progression, 3);
      var s = 0.86 + 0.14 * e;
      groupe.scale.set(s, s, s);
      groupe.position.y = -0.6 + 0.6 * e;
    }

    /* Rotation automatique douce + inertie souris */
    tempsInactif += dt;
    if (tempsInactif > 4 && !enTrainDeGlisser) rotationCibleY += dt * 0.06;
    groupe.rotation.y += (rotationCibleY + vueCible.rotY + 0.35 - groupe.rotation.y) * 0.06;
    groupe.rotation.x += (rotationCibleX - groupe.rotation.x) * 0.06;

    /* Respiration + ondulation des alvéoles */
    var respiration = 1 + Math.sin(t * 0.8) * 0.008;
    groupe.scale.y = groupe.scale.x * respiration;
    placerCellules(t, true);

    /* Particules d'air */
    var attribut = geometrieAir.attributes.position;
    for (var k = 0; k < NB_PARTICULES; k++) {
      var y = attribut.getY(k) + vitesses[k];
      if (y > 4.2) y = -1;
      attribut.setY(k, y);
    }
    attribut.needsUpdate = true;

    /* Caméra vers la vue cible */
    camera.position.lerp(vueCible.pos, 0.045);
    camera.lookAt(0, 0.6, 0);

    renderer.render(scene, camera);
  }
  animer();

  /* --- Redimensionnement --- */
  window.addEventListener('resize', function () {
    var w = conteneur.clientWidth, h = conteneur.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
})();
