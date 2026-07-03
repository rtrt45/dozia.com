/* ==========================================================================
   DOZIA — Interactions & animations
   ========================================================================== */
(function () {
  'use strict';

  var prefereReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     En-tête : état au scroll
     ------------------------------------------------------------------ */
  var entete = document.getElementById('entete');
  if (entete) {
    var majEntete = function () {
      entete.classList.toggle('est-scrolle', window.scrollY > 8);
    };
    window.addEventListener('scroll', majEntete, { passive: true });
    majEntete();
  }

  /* ------------------------------------------------------------------
     Menu mobile
     ------------------------------------------------------------------ */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var ouvert = nav.classList.toggle('est-ouverte');
      burger.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
      burger.setAttribute('aria-label', ouvert ? 'Fermer le menu' : 'Ouvrir le menu');
      document.body.style.overflow = ouvert ? 'hidden' : '';
    });
    nav.querySelectorAll('a').forEach(function (lien) {
      lien.addEventListener('click', function () {
        nav.classList.remove('est-ouverte');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ------------------------------------------------------------------
     Révélation au scroll
     ------------------------------------------------------------------ */
  var revelables = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !prefereReduit) {
    var observateur = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (entree) {
        if (entree.isIntersecting) {
          entree.target.classList.add('est-visible');
          observateur.unobserve(entree.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revelables.forEach(function (el) { observateur.observe(el); });
  } else {
    revelables.forEach(function (el) { el.classList.add('est-visible'); });
  }

  /* ------------------------------------------------------------------
     Parallax léger des blobs du héro
     ------------------------------------------------------------------ */
  var blobs = document.querySelectorAll('.blob');
  if (blobs.length && !prefereReduit) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        blobs.forEach(function (blob, i) {
          blob.style.marginTop = (y * (0.06 + i * 0.03)) + 'px';
        });
        ticking = false;
      });
    }, { passive: true });
  }

  /* ------------------------------------------------------------------
     Curseur personnalisé (desktop uniquement)
     ------------------------------------------------------------------ */
  var curseur = document.getElementById('curseur');
  if (curseur && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !prefereReduit) {
    var cx = -100, cy = -100, px = -100, py = -100;
    document.addEventListener('mousemove', function (e) {
      cx = e.clientX; cy = e.clientY;
      curseur.classList.add('est-actif');
    });
    document.addEventListener('mouseleave', function () { curseur.classList.remove('est-actif'); });
    var boucleCurseur = function () {
      px += (cx - px) * 0.18;
      py += (cy - py) * 0.18;
      curseur.style.transform = 'translate(' + px + 'px,' + py + 'px) translate(-50%,-50%)';
      requestAnimationFrame(boucleCurseur);
    };
    boucleCurseur();
    document.addEventListener('mouseover', function (e) {
      curseur.classList.toggle('est-lien', !!e.target.closest('a, button, summary, [data-vue]'));
    });
  }

  /* ==================================================================
     PANIER
     ================================================================== */
  var CATALOGUE = {
    solo:    { nom: 'Oreiller Dozia — Solo',            variante: '1 oreiller + housse',            prix: 79,    image: 'assets/img/produit-principal.jpg' },
    duo:     { nom: 'Oreiller Dozia — Duo',             variante: '2 oreillers + 2 taies offertes', prix: 139,   image: 'assets/img/produit-duo.jpg' },
    famille: { nom: 'Oreiller Dozia — Famille',         variante: '3 oreillers + 3 taies offertes', prix: 189,   image: 'assets/img/lifestyle-pile.jpg' },
    housse:  { nom: 'Housse fraîcheur de rechange',     variante: 'Maille 3D respirante',           prix: 24.9,  image: 'assets/img/produit-housse.jpg' }
  };
  var SEUIL_LIVRAISON = 50;

  function lirePanier() {
    try { return JSON.parse(localStorage.getItem('panier-dozia') || '{}'); }
    catch (e) { return {}; }
  }
  function ecrirePanier(panier) {
    localStorage.setItem('panier-dozia', JSON.stringify(panier));
  }
  function formaterPrix(valeur) {
    return valeur.toLocaleString('fr-FR', { minimumFractionDigits: valeur % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';
  }

  var tiroir = document.getElementById('tiroir-panier');
  var voile = document.getElementById('voile');
  var corps = document.getElementById('tiroir-corps');
  var compteBadge = document.getElementById('panier-compte');
  var totalEl = document.getElementById('panier-total');
  var barreProgression = document.getElementById('barre-progression');
  var texteProgression = document.getElementById('texte-progression');

  function rendrePanier() {
    var panier = lirePanier();
    var cles = Object.keys(panier).filter(function (c) { return panier[c] > 0 && CATALOGUE[c]; });
    var nombre = 0, total = 0;
    cles.forEach(function (c) { nombre += panier[c]; total += panier[c] * CATALOGUE[c].prix; });

    if (compteBadge) {
      compteBadge.textContent = String(nombre);
      compteBadge.classList.toggle('est-visible', nombre > 0);
    }
    if (totalEl) totalEl.textContent = formaterPrix(total);

    if (barreProgression && texteProgression) {
      var pct = Math.min(100, (total / SEUIL_LIVRAISON) * 100);
      barreProgression.style.width = pct + '%';
      if (total <= 0) {
        texteProgression.innerHTML = 'Livraison offerte dès ' + SEUIL_LIVRAISON + ' € d’achat';
      } else if (total >= SEUIL_LIVRAISON) {
        texteProgression.innerHTML = '<strong>Félicitations, la livraison vous est offerte&nbsp;!</strong>';
      } else {
        texteProgression.innerHTML = 'Plus que <strong>' + formaterPrix(SEUIL_LIVRAISON - total) + '</strong> pour la livraison offerte';
      }
    }

    if (!corps) return;
    if (!cles.length) {
      corps.innerHTML =
        '<div class="panier-vide">' +
        '<svg aria-hidden="true"><use href="#i-panier"/></svg>' +
        '<p>Votre panier est vide.<br>Vos meilleures nuits vous attendent.</p>' +
        '<a href="produit.html" class="bouton bouton-primaire">Découvrir l’oreiller</a>' +
        '</div>';
      return;
    }
    corps.innerHTML = cles.map(function (c) {
      var art = CATALOGUE[c];
      return (
        '<div class="ligne-panier" data-cle="' + c + '">' +
          '<img src="' + art.image + '" alt="" width="76" height="76" loading="lazy">' +
          '<div>' +
            '<p class="nom">' + art.nom + '</p>' +
            '<p class="variante">' + art.variante + '</p>' +
            '<p class="prix">' + formaterPrix(art.prix) + '</p>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<div class="controle-quantite">' +
              '<button type="button" data-action="moins" aria-label="Réduire la quantité">−</button>' +
              '<span class="qte">' + lirePanier()[c] + '</span>' +
              '<button type="button" data-action="plus" aria-label="Augmenter la quantité">+</button>' +
            '</div><br>' +
            '<button type="button" class="supprimer" data-action="supprimer">Retirer</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function ouvrirPanier() {
    if (!tiroir || !voile) return;
    rendrePanier();
    voile.hidden = false;
    requestAnimationFrame(function () {
      voile.classList.add('est-visible');
      tiroir.classList.add('est-ouvert');
      tiroir.setAttribute('aria-hidden', 'false');
    });
    document.body.style.overflow = 'hidden';
  }
  function fermerPanier() {
    if (!tiroir || !voile) return;
    voile.classList.remove('est-visible');
    tiroir.classList.remove('est-ouvert');
    tiroir.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(function () { voile.hidden = true; }, 550);
  }

  function ajouterAuPanier(cle, quantite) {
    if (!CATALOGUE[cle]) return;
    var panier = lirePanier();
    panier[cle] = (panier[cle] || 0) + (quantite || 1);
    ecrirePanier(panier);
    rendrePanier();
    ouvrirPanier();
    afficherToast('Ajouté au panier — ' + CATALOGUE[cle].nom);
  }

  document.addEventListener('click', function (e) {
    var declencheur = e.target.closest('[data-ajout]');
    if (declencheur) {
      var qte = 1;
      var champQte = document.getElementById('quantite');
      if (champQte && declencheur.hasAttribute('data-avec-quantite')) {
        qte = Math.max(1, parseInt(champQte.textContent || '1', 10));
      }
      ajouterAuPanier(declencheur.getAttribute('data-ajout'), qte);
      return;
    }
    var controle = e.target.closest('[data-action]');
    if (controle && corps && corps.contains(controle)) {
      var ligne = controle.closest('.ligne-panier');
      var cle = ligne.getAttribute('data-cle');
      var panier = lirePanier();
      if (controle.dataset.action === 'plus') panier[cle] = (panier[cle] || 0) + 1;
      if (controle.dataset.action === 'moins') panier[cle] = Math.max(0, (panier[cle] || 0) - 1);
      if (controle.dataset.action === 'supprimer') panier[cle] = 0;
      ecrirePanier(panier);
      rendrePanier();
    }
  });

  var boutonOuvrir = document.getElementById('ouvrir-panier');
  var boutonFermer = document.getElementById('fermer-panier');
  if (boutonOuvrir) boutonOuvrir.addEventListener('click', ouvrirPanier);
  if (boutonFermer) boutonFermer.addEventListener('click', fermerPanier);
  if (voile) voile.addEventListener('click', fermerPanier);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') fermerPanier();
  });

  var boutonCommander = document.getElementById('bouton-commander');
  if (boutonCommander) {
    boutonCommander.addEventListener('click', function () {
      var panier = lirePanier();
      var vide = !Object.keys(panier).some(function (c) { return panier[c] > 0; });
      if (vide) { afficherToast('Votre panier est vide.'); return; }
      afficherToast('Redirection vers le paiement sécurisé…');
    });
  }

  rendrePanier();

  /* ------------------------------------------------------------------
     Toast
     ------------------------------------------------------------------ */
  var toast = document.getElementById('toast');
  var minuterieToast = null;
  function afficherToast(message) {
    if (!toast) return;
    toast.innerHTML = '<svg aria-hidden="true"><use href="#i-coche-cercle"/></svg>' + message;
    toast.classList.add('est-visible');
    clearTimeout(minuterieToast);
    minuterieToast = setTimeout(function () { toast.classList.remove('est-visible'); }, 3200);
  }
  window.doziaToast = afficherToast;

  /* ==================================================================
     PAGE PRODUIT
     ================================================================== */

  /* Galerie */
  var galeriePrincipale = document.getElementById('galerie-principale');
  var imagePrincipale = document.getElementById('image-principale');
  if (galeriePrincipale && imagePrincipale) {
    document.querySelectorAll('.galerie-vignettes button').forEach(function (vignette) {
      vignette.addEventListener('click', function () {
        document.querySelectorAll('.galerie-vignettes button').forEach(function (v) { v.classList.remove('est-active'); });
        vignette.classList.add('est-active');
        imagePrincipale.style.opacity = '0';
        setTimeout(function () {
          imagePrincipale.src = vignette.getAttribute('data-image');
          imagePrincipale.alt = vignette.getAttribute('data-alt') || '';
          imagePrincipale.style.opacity = '1';
        }, 180);
      });
    });
    /* Zoom au survol */
    galeriePrincipale.addEventListener('mousemove', function (e) {
      var zone = galeriePrincipale.getBoundingClientRect();
      var x = ((e.clientX - zone.left) / zone.width) * 100;
      var y = ((e.clientY - zone.top) / zone.height) * 100;
      imagePrincipale.style.transformOrigin = x + '% ' + y + '%';
    });
    galeriePrincipale.addEventListener('mouseenter', function () { galeriePrincipale.classList.add('est-zoomee'); });
    galeriePrincipale.addEventListener('mouseleave', function () { galeriePrincipale.classList.remove('est-zoomee'); });
  }

  /* Variantes */
  var prixProduit = document.getElementById('prix-produit');
  var prixBarreProduit = document.getElementById('prix-barre-produit');
  var boutonAjout = document.getElementById('bouton-ajout-produit');
  document.querySelectorAll('.option-variante').forEach(function (option) {
    option.addEventListener('click', function () {
      document.querySelectorAll('.option-variante').forEach(function (o) {
        o.classList.remove('est-active');
        o.setAttribute('aria-pressed', 'false');
      });
      option.classList.add('est-active');
      option.setAttribute('aria-pressed', 'true');
      if (prixProduit) prixProduit.textContent = option.getAttribute('data-prix') + ' €';
      if (prixBarreProduit) prixBarreProduit.textContent = option.getAttribute('data-prix-barre') + ' €';
      if (boutonAjout) boutonAjout.setAttribute('data-ajout', option.getAttribute('data-cle'));
      var barreNom = document.getElementById('barre-atc-variante');
      if (barreNom) barreNom.textContent = option.querySelector('.nom-variante').textContent;
      var barrePrix = document.getElementById('barre-atc-prix');
      if (barrePrix) barrePrix.textContent = option.getAttribute('data-prix') + ' €';
      var barreBouton = document.getElementById('barre-atc-bouton');
      if (barreBouton) barreBouton.setAttribute('data-ajout', option.getAttribute('data-cle'));
    });
  });

  /* Quantité */
  var champQuantite = document.getElementById('quantite');
  if (champQuantite) {
    document.querySelectorAll('[data-quantite]').forEach(function (bouton) {
      bouton.addEventListener('click', function () {
        var valeur = parseInt(champQuantite.textContent, 10) || 1;
        valeur += bouton.getAttribute('data-quantite') === 'plus' ? 1 : -1;
        champQuantite.textContent = String(Math.max(1, Math.min(9, valeur)));
      });
    });
  }

  /* Date de livraison estimée */
  var dateLivraison = document.getElementById('date-livraison');
  if (dateLivraison) {
    var ajouterJoursOuvres = function (date, jours) {
      var d = new Date(date);
      while (jours > 0) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0 && d.getDay() !== 6) jours--;
      }
      return d;
    };
    var options = { weekday: 'long', day: 'numeric', month: 'long' };
    var debut = ajouterJoursOuvres(new Date(), 3);
    var fin = ajouterJoursOuvres(new Date(), 5);
    dateLivraison.textContent =
      'entre le ' + debut.toLocaleDateString('fr-FR', options) + ' et le ' + fin.toLocaleDateString('fr-FR', options);
  }

  /* Barre d'achat collante */
  var barreAtc = document.getElementById('barre-atc');
  var zoneAchat = document.getElementById('zone-achat');
  if (barreAtc && zoneAchat && 'IntersectionObserver' in window) {
    var observateurAtc = new IntersectionObserver(function (entrees) {
      barreAtc.classList.toggle('est-visible', !entrees[0].isIntersecting && entrees[0].boundingClientRect.top < 0);
    }, { threshold: 0 });
    observateurAtc.observe(zoneAchat);
  }
})();
