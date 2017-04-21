/******Variables globales*******/
/**
 * Variable globale contenant les ID des cubes non supprimés.
 * @var {number[]} tabID
 */
var tabId = [];

/**
 * Contient true si bonnus et false sinon.
 * @var {bool} bonGD
 */
var bonGD = false;

//Initialiser à zero pour pouvoir detruire plusieurs cubes en même temps
var nbClic = 0;

//Pour initialiser la dimension du cube par le serveur
var cubeDim;

targetRotation = 0;
/**
 * Contient la profondeur courante des cubes qu'on peut supprimer.
 * @var {number} profondeurGeneral
 */
var profondeurGeneral = 4;

/**
 * On stock le pseudo du joueur dans ce variable
 * @var {String} pseudo
 */
var pseudo;

/**
@var ws {instanceWebsocket} Instance du websocket.
*/
var ws = new WebSocket('wss://' + window.location.host);

/*****Selection et Utilisation des éléments du DOM******/
var body = document.querySelector("#bodydiv");

var div = document.querySelector('#result table');

var containerCube = document.querySelector('#cubeRightPanel');

//Au chargement de la page on crée l'interface jeu
// body.onload = creerCube(document.querySelector("#canvaContainer"), cubeDim, paper);

//On attache l'évènement clic pour l'utilisation du bonnusGD
var butBonusGrosDoigt = document.querySelectorAll('.buttBonus')[0];
butBonusGrosDoigt.addEventListener('click', (evt) => {
    ws.send(JSON.stringify({
        action: 'bonusGD'
    }));
});

//On attache l'évènement clic pour l'utilisation du bonnusSUDO
var butBonusSudo = document.querySelectorAll('.buttBonus')[1];
butBonusSudo.addEventListener('click', (evt) => {
    ws.send(JSON.stringify({
        action: 'bonusSUDO'
    }));
});

//On attache l'évènement clic pour l'achat du bonnusGD
var achatBonusGrosDoigt = document.querySelector('#achatGD');
achatBonusGrosDoigt.addEventListener('click', (evt) => {
    ws.send(JSON.stringify({
        action: 'achatBonusGD'
    }));
});

//On attache l'évènement clic pour l'achat du bonnusSUDO
var achatBonusSudo = document.querySelector('#achatSUDO');
achatBonusSudo.addEventListener('click', (evt) => {
    ws.send(JSON.stringify({
        action: 'achatBonusSUDO'
    }));
});

//On attache l'évènement clic pour l'arrêt du son
var sonArrierePlan = document.querySelector("#sonArrierePlan");
var butMute = document.querySelector('#mute');
butMute.addEventListener('click', () => {
    sonArrierePlan.pause();
});

//On attache l'évènement clic pour joueur le son
var reactSon = document.querySelector('#son');
reactSon.addEventListener('click', () => {
    sonArrierePlan.play();
})


/**
 * Ici initialisation de Raphael et creation d'un canvas.
 * @Raphael
 * @param {element} body - l'element auquel sera rattaché le canvas
 * @param {int}  largeur - largeur du canvas.
 * @param {int} longueur - longueur du canvas.
 */
var paper = Raphael(canvaContainer, 163, 163); //canvas associé  


//handler associé à l'ouverture du websocket avec le serveur  
ws.addEventListener('open', function(e) {

    ws.addEventListener('message', function(e) {
        /**
         * @param data {Object} message reçu du serveur
         */
        var data = JSON.parse(e.data);

        //console.log(data);
        switch (data.statut) {
            case 'syncDimCube':
                cubeDim = data.dimCube;
                //Au chargement de la page on crée l'interface jeu
                body.onload = creerCube(document.querySelector("#canvaContainer"), cubeDim, paper);
                break;

            case 'newJoueur':
                pseudo = data.pseudo;
                if (data.destroyedSave) {
                    for (var i = 0; i < data.destroyedSave.length; i++) {
                        tabId.splice(indice(data.destroyedSave[i]), 1);
                        dropeById(data.destroyedSave[i], paper);
                    }
                }

                break;

            case 'ENLIGNE':
                majAllPlayer(data);
                break;

            case 'LOGOUT':
                majAllPlayer(data);
                break;

            case 'JOUER':

                //changement du cube courant
                profondeurGeneral = data.current_objet.profondeurObj;
                tabId.splice(indice(data.current_objet), 1);
                dropeById(data.current_objet, paper);
                majAllPlayer(data);

                if (bonGD && nbClic > 0) {

                    var i = tabId.length - 1;
                    var msg = {
                        action: 'jouer',
                        currentDestroyed: tabId[i]
                    };

                    //envoie du message au serveur
                    ws.send(JSON.stringify(msg));
                    nbClic--;
                    if (nbClic == 0)
                        bonGD = false;

                }
                break;

            case 'WIN':
                //Pour l'affichage d'un popup lorsqu'il y'a un gagnant
                $(function() {
                    $('#bodyPopup').toggleClass('overlay');
                    $('#bodyPopup').css('display', 'table');
                    $('.popScroll').toggleClass('lance');
                    $('.popup').toggleClass('lance');
                    $('.boxi').toggleClass('lance');
                    $('#home').toggleClass('lance');
                    $('#close').toggleClass('lance');
                    $('#home').toggleClass('lance');
                    $('#close').toggleClass('lance');
                    $('.ribbon').toggleClass('lance');
                    $('#win').text('Gagnant: ' + data.winner + ' | Score: ' + data.score);
                });
                break;

            case 'ACHATGD':
                majAllPlayer(data);
                break;

            case 'NONACHATGD':
                alert("Vous avez besoin de 30 points pour l'achat de Bonnus");
                break;

            case 'ACHATSUDO':
                majAllPlayer(data);
                break;

            case 'NONACHATSUDO':
                alert("Vous avez besoin de 60 points pour l'achat de ce Bonnus");
                break;

            case 'CONFGD':
                bonGD = true;
                nbClic = 3;
                majCurentPlayer(data);
                break;

            case 'NONCONFGD':
                alert("Vous n'avez pas de bonnus GD");
                break;

            case 'CONFSUDO':
                Loader.initTime({
                    // time: 10000,
                    nom: data.player,
                    blocClic: false
                });
                majCurentPlayer(data);
                break;

            case 'NONCONFSUDO':
                alert("Vous n'avez pas de bonnus SUDO");
                break;

            case 'MODSUDO':
                Loader.initTime({
                    // time: 10000,
                    nom: data.player,
                    blocClic: true
                });
                majAllPlayer(data);
                break;

            default:
                alert('Erreur lors de l\'interpretation du message');
        }
    });
});

/** Fonction permettant de créer un nouveau noeud
 * @param {element} parent element parent.
 * @param {element} balise element a accrocher au parent.
 */
function ajoute(parent, balise) {
    return parent.appendChild(document.createElement(balise));
}

/** Fonction permettant de rechercher un indice dans un tableau connaissant sa valeur
 *@param {Object} objet element parent.
 *@return {number} indice indice de l'element dans le tableau
 */
function indice(objet) {
    for (var i = 0; i < tabId.length; i++) {
        if (tabId[i].id == objet.id)
            return i;
    }
}

/**Pour la generation de la liste des joueurs.
 *@param {Object} data Objet transmis par le serveur.
 */
function majAllPlayer(data) {
    var result = data;
    /*************** Tri par ordre croissant du score ***************************/
    result.infoJoueurs.sort(function(a, b) {
        return b.scoreActu - a.scoreActu;
    });

    /* Update du tableau*/
    div.innerHTML = '';
    var tr = ajoute(div, 'tr');

    //Th Joueurs
    var th = ajoute(tr, 'th');
    th.appendChild(document.createTextNode('Joueurs'));

    //Th Score
    th = ajoute(tr, 'th');
    th.appendChild(document.createTextNode('Score'));

    //Affichage contenu du data
    for (var i = 0; i < result.infoJoueurs.length; i++) {

        if (pseudo == result.infoJoueurs[i].pseudo) {

            var domAjoutScoreCourant = document.createElement('span');
            var ouAjoute = document.querySelector('#core');
            var texte = document.createTextNode(result.infoJoueurs[i].scoreActu);
            ouAjoute.innerHTML = '';
            domAjoutScoreCourant.appendChild(texte);
            ouAjoute.appendChild(domAjoutScoreCourant);

            //Insertion Bonnus Gros doigt
            var bonnusGD = document.querySelector('#bonusGD');
            bonnusGD.innerHTML = '';
            var b1 = document.createTextNode(result.infoJoueurs[i].grosDoigt);
            bonnusGD.appendChild(b1);

            //Insertion Bonnus Gros Sudo
            var bonnusSu = document.querySelector('#bonusSudo');
            bonnusSu.innerHTML = '';
            var b2 = document.createTextNode(result.infoJoueurs[i].sudo);
            bonnusSu.appendChild(b2);
        }
        else {

            tr = ajoute(div, 'tr');
            //Insertion Joueur i 
            var td = ajoute(tr, 'td');
            var joueur = document.createTextNode(result.infoJoueurs[i].pseudo);
            td.appendChild(joueur);

            //Insertion Score
            td = ajoute(tr, 'td');
            var score = document.createTextNode(result.infoJoueurs[i].scoreActu);
            td.appendChild(score);
        }

    }
}

/**
 * Pour mettre à jour le nombre de bonnus d'un joueur
 * utilisant son bonnus
 * @param {Object} data Objet transmis par le serveur.
 */
function majCurentPlayer(data) {
    //Insertion Bonnus Gros doigt
    var bonnusGD = document.querySelector('#bonusGD');
    bonnusGD.innerHTML = '';
    var b1 = document.createTextNode(data.infoJoueurs.grosDoigt);
    bonnusGD.appendChild(b1);

    //Insertion Bonnus Gros Sudo
    var bonnusSu = document.querySelector('#bonusSudo');
    bonnusSu.innerHTML = '';
    var b2 = document.createTextNode(data.infoJoueurs.sudo);
    bonnusSu.appendChild(b2);
}

/** Fonction pour la deconnexion envoie un message de deconnexion exit au serveur
 *@function exit
 */
function exit() {
    var msg = {
        action: 'exit'
    };
    ws.send(JSON.stringify(msg));
}


/** Fonction permettant de créer l'espace Jeu
 * @function creerCube
 * @param {element} parent element parent.
 * @param {number} arrete dimension du cube.
 */
function creerCube(Element, dimCube, paper1) {

    //definition des variables 
    var globArreteDim = dimCube;
    var globTailleCube = 30;
    var globEspacement = 2;
    var globPostionOffset = globTailleCube + globEspacement;


    //définition de la grille(rectangle) a trois dimensions
    var rectangle = new Array();
    for (var i = 0; i < globArreteDim; i++) {
        rectangle[i] = new Array();
    }
    for (i = 0; i < globArreteDim; i++) {
        for (var j = 0; j < globArreteDim; j++) {
            rectangle[i][j] = new Array();
        }
    }
    //fin grille trois dimensions

    var identifiant = 0;
    //creation des objets rectangle RaphaelJs 
    for (var k = 0; k < globArreteDim; k++) {
        for (i = 0; i < globArreteDim; i++) {
            for (j = 0; j < globArreteDim; j++) {
                rectangle[k][i][j] = paper1.rect(i * globPostionOffset, j * globPostionOffset, globTailleCube, globTailleCube, 1)
                    .attr({
                        fill: 'rgb(' + k * 25 + ',' + k * 50 + ',' + k * 90 + ')'
                    });
                rectangle[k][i][j].id = identifiant;
                rectangle[k][i][j].node.id = identifiant;
                rectangle[k][i][j].node.profondeur = k;
                //  console.log(rectangle[k][i][j].id);
                //console.log(rectangle[k][i][j].node.id);

                //ajout de l'identifiant du tableau a tabID
                tabId.push({
                    id: identifiant,
                    profondeurObj: k
                });
                identifiant++;

                //transmission de l'objet courant cliqué a l'objet coordonnes
                rectangle[k][i][j].node.onclick = function(evt) {
                    var coordonnes = {
                        id: evt.target.id,
                        profondeurObj: evt.target.profondeur
                    };

                    //construction du message pour transmission des coordonnées au serveur
                    var msg = {
                        action: 'jouer',
                        currentDestroyed: coordonnes
                    };
                    ws.send(JSON.stringify(msg));
                };
            }
        }
    }
}

/** Fonction permettant de supprimer les cubes selon leur ID
 * @param {Object} coordo Object avec un attribut id permettant de supprimer un cube.
 * @param {paper} paper Canvas d'un objet Raphael.
 */
function dropeById(coordo, paper1) {
    var aSupprimer = paper1.getById(coordo.id);
    // console.log('here :' + aSupprimer);
    // console.log('objet' + aSupprimer);
    aSupprimer.remove();
}


/**
 * Affichage du popup pour faire l'achat de bonnus avec Jquery
 */
//Affiche un popup pour faire des achats
$('#achatBonus').click(function(e) {
    $('.popup-wrap').fadeIn(250);
    $('.popup-box').removeClass('transform-out').addClass('transform-in');

    e.preventDefault();
});

//Pour fermer le popup
$('.popup-close').click(function(e) {
    $('.popup-wrap').fadeOut(500);
    $('.popup-box').removeClass('transform-in').addClass('transform-out');

    e.preventDefault();
});

//Pour fermer le popup quand le joueur achète un bonnus
$('a.signup').click(function(e) {
    $('.popup-wrap').fadeOut(500);
    $('.popup-box').removeClass('transform-in').addClass('transform-out');

    e.preventDefault();
});

/**
 * Objet permettant de lancer et d'arrêter le timer lorsque le joueur est en mode sudo
 * (super joueur). Dans notre cas initialisé a 10s. Un booléen pour bloquer ou non le
 * clic des autres joueurs et l'élément du DOM sur lequel empêcher le clic
 * Inspiré de Thermometer-like progress bar de Denys Misnunov.
 */
var Loader = function() {
    var text = document.querySelector('#text');
    var loader = document.querySelector('.loader-container');
    var canvas = document.querySelector('.main-content');
    var meter = document.querySelector('.meter');
    meter.appendChild(document.createTextNode('0'));
    var k, i = 1;
    var counter = function() {
        if (i <= 10) {
            loader.setAttribute('style', "display:inherit");
            meter.innerHTML = i.toString();
            i++;
        }
        else {
            window.clearInterval(k);
            loader.className = 'loader-container';
            meter.className = 'meter';
            meter.innerHTML = '';
            meter.appendChild(document.createTextNode('0'));
            loader.setAttribute('style', "display:none");
            canvas.style.pointerEvents = "visible";
            text.innerHTML = '';
            i = 1;
        }
    };
    return {
        initTime: function(options) {
            options = options || {};
            //var time = options.time ? options.time : 0,
            var interval = 1000;
            text.appendChild(document.createTextNode(options.nom + ' est en super joueur'));
            //On block le clic des autres joueurs
            if (options.blocClic)
                canvas.style.pointerEvents = "none";
            loader.classList.add('run');
            k = window.setInterval(counter, interval);
            //     setTimeout(function() {
            //         loader.classList.add('done');
            //     }, time);
        },
    };
}();


// var containerCube = document.querySelector('#cubeRightPanel');
/**Cette partie concerne le début d'intégration du THREE js dans
 * notre projet, car on n'a pas totalement fini de faire la liaison
 * avec le cube qu'on a crée avec CANVAS
 */
var profondeurSaved = 4;


/****/
/**container: element DOM qui va contenir le cube 3D, camera: camera sur la scène**/
var container;
var camera, scene, renderer;
var cube, plane;
//variable qui vaudra 1 ou 0 durant 100ms pour assurer la otation du cube durant ce m^me temps
var targetRotation = 0;
//init : fonction pour l'initialisation de la scène
init();
//animate : fonction pour l'animation de la scène
animate();
var geometry;
function init() {

    /***creation de l'element DOM qui contiendra le rendu 3D*****/
    container = document.querySelector("#cubeRightPanel");
    var info = document.createElement('div');
    info.style.position = 'absolute';
    info.style.textAlign = 'center';
    container.appendChild(info);
    /***fin creation element ici***/

    /**definition de la camera, et de la scène****/
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.y = 80;
    camera.position.z = 500 / 2;
    scene = new THREE.Scene();
    /****fin ici***/

    /**creation de la structure du cube et assignation de couleur à chaque face du cube**/
   geometry = new THREE.CubeGeometry(100, 50, 100);
    console.log(profondeurGeneral);
    //for (var i = 0; i < geometry.faces.length; i += 2) {
    geometry.faces[0].color = new THREE.Color(0x19325a);
    geometry.faces[1].color = new THREE.Color(0x19325a);
    geometry.faces[2].color = new THREE.Color(0x4b970e);
    geometry.faces[3].color = new THREE.Color(0x4b970e);
    geometry.faces[4].color = new THREE.Color(0x14bc65);
    geometry.faces[5].color = new THREE.Color(0x14bc65);
    geometry.faces[6].color = new THREE.Color(0x14bc65);
    geometry.faces[7].color = new THREE.Color(0x14bc65);
    geometry.faces[8].color = new THREE.Color(0x64c968);
    geometry.faces[9].color = new THREE.Color(0x64c968);
    geometry.faces[10].color = new THREE.Color(0x3264b4);
    geometry.faces[11].color = new THREE.Color(0x3264b4);

    //}
    /**fin creation structure cube ici***/

    /**definition du materiau a utiliser pour peupler le cube et dessin du cube ici**/
    var material = new THREE.MeshBasicMaterial({
        vertexColors: THREE.FaceColors,
        overdraw: 0.5
    });
    cube = new THREE.Mesh(geometry, material);
    /***fin creation du materiau et dessin du cube ici***/

    /**Positionnement du cube, afin de pouvoir être vissible par la camera**/
    cube.position.y = 80;
    //ajout du cube à la scène
    scene.add(cube);
    /** fin definition et dessin du cube**/
    
    
    /**** pour le plan(le petit truc blanc qui tourne en dessous du gros cube)**/
    var geometryPlane = new THREE.PlaneBufferGeometry(100, 100);
    
    geometryPlane.rotateX(-Math.PI / 2);
    var material = new THREE.MeshBasicMaterial({
        color: 0xe0e0e0,
        overdraw: 0.5
    });
    
    //definition de la structure du plan
    plane = new THREE.Mesh(geometryPlane, material);

    //ajout de la structucture à la scène 
    scene.add(plane);
    
    //creation du rendu
    renderer = new THREE.CanvasRenderer();
    
    //qualité 
    renderer.setPixelRatio(canvaContainer.devicePixelRatio);
    
    //definition de la taille du rendu
    renderer.setSize(containerCube.offsetWidth, containerCube.offsetHeight);
    
    //ajout du rendu transformé en élément dom au container
    container.appendChild(renderer.domElement);
    
    //animation(boucle pour toujours observer la scène)
    animate();

}

function animate() {
    requestAnimationFrame(animate);
    render();
}

function render() {
    if (profondeurGeneral != profondeurSaved) {
        targetRotation = 1;
        window.setTimeout(function() {
            targetRotation = 0;
        }, 100);
        profondeurSaved -= 1;
    }
    if(profondeurGeneral==0){
      geometry.faces[8].color = new THREE.Color(0x000000);
      geometry.faces[9].color = new THREE.Color(0x000000);
    }

    plane.rotation.y = cube.rotation.y += targetRotation * 0.1324359;
    renderer.render(scene, camera);
}
/**fin 3D ici***/
