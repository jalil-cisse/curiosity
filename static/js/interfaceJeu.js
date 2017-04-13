/*****Selection et Utilisation des éléments du DOM******/
var body = document.querySelector("#bodydiv");

/**
 * Ici initialisation de Raphael et creation d'un canvas.
 * @Raphael
 * @param {element} body - l'element auquel sera rattaché le canvas
 * @param {int}  largeur - largeur du canvas.
 * @param {int} longueur - longueur du canvas.
 */
var paper = Raphael(canvaContainer, 163, 163); //canvas associé  

/**
 * Variable globale contenant les ID des cubes non supprimés.
 * @var {number[]} tabID
 */
var tabId = [];

/**
 * Contient true si bonus et false sinon.
 * @var {bool} bonGD
 */
var bonGD = false;
var nbClic = 0;

targetRotation = 0;
/**
 * Contient la profondeur courante des cubes qu'on peut supprimer.
 * @var {number} profondeurGeneral
 */
var profondeurGeneral = 4;

var pseudo;

var div = document.querySelector('#result table');

/** Fonction permettant de créer un nouveau noeud
 * @param {element} parent element parent.
 * @param {element} balise element a accrocher au parent.
 */
function ajoute(parent, balise) {
    return parent.appendChild(document.createElement(balise));
}

/**
@var ws {instanceWebsocket} Instance du websocket.
*/
var ws = new WebSocket('wss://' + window.location.host);

//handler associé à l'ouverture du websocket avec le serveur  
ws.addEventListener('open', function(e) {
    ws.addEventListener('message', function(e) {
        /**
         * @param data {Object} message recu du serveur
         */
        var data = JSON.parse(e.data);

        //console.log(data);
        switch (data.statut) {
            case 'newJoueur':
                pseudo = data.pseudo;
                if (data.destroyedSave) {
                    for (var i = 0; i < data.destroyedSave.length; i++) {
                        console.log('DANS FOR:' + data.destroyedSave[i]);
                        tabId.splice(indice(data.destroyedSave[i]), 1);
                        dropeById(data.destroyedSave[i], paper);
                    }
                }

                break;

            case 'ENLIGNE':
                majAllPlayer(data);
                console.log('ENLIGNE-ChargePage');
                break;

            case 'LOGOUT':
                majAllPlayer(data);
                break;

            case 'JOUER':

                console.log(bonGD);

                //changement du cube courant
                profondeurGeneral = data.current_objet.profondeurObj;
                console.log("ProfondeurGeneral" + profondeurGeneral);
                tabId.splice(indice(data.current_objet), 1);
                dropeById(data.current_objet, paper);
                majAllPlayer(data);

                //console.log('longueur tableau' +tabId.length);
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
                //alert('Message: '+data.winner+' '+data.score);
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
                //console.log('BONNUS: '+bonGD+' '+nbClic+' Clic');
                break;

            case 'NONCONFGD':
                alert("Vous n'avez pas assez de points (30) pour utiliser ce Bonnus");
                break;

            case 'CONFSUDO':
                Loader.initTime({
                    time: 10000,
                    nom: data.player,
                    blocClic: false
                });
                majCurentPlayer(data);
                console.log('CONFSUDO');
                break;

            case 'NONCONFSUDO':
                alert("Vous n'avez pas assez de points (60) pour utiliser ce Bonnus");
                break;

            case 'MODSUDO':
                Loader.initTime({
                    time: 10000,
                    nom: data.player,
                    blocClic: true
                });
                majAllPlayer(data);
                console.log('CONFSUDO');
                break;

            default:
        }
    });
});

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

    /*var domAjoutScoreCourant;
    domAjoutScoreCourant = document.createElement('span');
    var ouAjoute = document.querySelector('#core');
    var texte = document.createTextNode(data.infoJoueurActu.scorActu);
    ouAjoute.innerHTML = '';
    domAjoutScoreCourant.appendChild(texte);
    ouAjoute.appendChild(domAjoutScoreCourant);

    //Insertion Bonnus Gros doigt
    var bonnusGD = document.querySelector('#bonusGD');
    bonnusGD.innerHTML = '';
    var b1 = document.createTextNode(data.infoJoueurActu.gdActu);
    bonnusGD.appendChild(b1);

    //Insertion Bonnus Gros Sudo
    var bonnusSu = document.querySelector('#bonusSudo');
    bonnusSu.innerHTML = '';
    var b2 = document.createTextNode(data.infoJoueurActu.sudoActu);
    bonnusSu.appendChild(b2);*/

    /* Update du tableau*/
    div.innerHTML = '';
    // function ajoute(parent,balise){
    //     return parent.appendChild(document.createElement(balise));
    // }
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
            var domAjoutScoreCourant;
            domAjoutScoreCourant = document.createElement('span');
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
 *@constructor
 */
function exit() {
    var msg = {
        action: 'exit'
    };
    ws.send(JSON.stringify(msg));
}


body.onload = creerCube(document.querySelector("#canvaContainer"), 5, paper);

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
                //console.log(identifiant);
                rectangle[k][i][j].id = identifiant;
                rectangle[k][i][j].node.id = identifiant;
                rectangle[k][i][j].node.profondeur = k;
                console.log(rectangle[k][i][j].id);
                console.log(rectangle[k][i][j].node.id);

                //ajout de l'identifiant du tableau a tabID
                tabId.push({
                    id: identifiant,
                    profondeurObj: k
                });
                identifiant++;

                //transmission de l'objet courant cliqué a l'objet coordonnes
                rectangle[k][i][j].node.onclick = function(evt) {
                    var coordonnes = {
                        x: evt.target.x.baseVal.value,
                        y: evt.target.y.baseVal.value,
                        id: evt.target.id,
                        profondeurObj: evt.target.profondeur
                    };

                    //construction du message pour transmission des coordonnées au serveur
                    var msg = {
                        action: 'jouer',
                        currentDestroyed: coordonnes
                    };
                    ws.send(JSON.stringify(msg));
                    console.log('COORD: ' + coordonnes.id);
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
    console.log('here :' + aSupprimer);
    console.log('objet' + aSupprimer);
    aSupprimer.remove();
}

var butBonusGrosDoigt = document.querySelectorAll('.buttBonus')[0];
butBonusGrosDoigt.addEventListener('click', (evt) => {
    ws.send(JSON.stringify({
        action: 'bonusGD'
    }));
});

var butBonusSudo = document.querySelectorAll('.buttBonus')[1];
butBonusSudo.addEventListener('click', (evt) => {
    ws.send(JSON.stringify({
        action: 'bonusSUDO'
    }));
});

var achatBonusGrosDoigt = document.querySelector('#achatGD');
achatBonusGrosDoigt.addEventListener('click', (evt) => {
    ws.send(JSON.stringify({
        action: 'achatBonusGD'
    }));
});

var achatBonusSudo = document.querySelector('#achatSUDO');
achatBonusSudo.addEventListener('click', (evt) => {
    ws.send(JSON.stringify({
        action: 'achatBonusSUDO'
    }));
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
            var time = options.time ? options.time : 0,
                interval = 1000;
            text.appendChild(document.createTextNode(options.nom + ' est en super joueur'));
            //On block le clic des autres joueurs
            if (options.blocClic)
                canvas.style.pointerEvents = "none";
            loader.classList.add('run');
            k = window.setInterval(counter, interval);
            setTimeout(function() {
                loader.classList.add('done');
            }, time);
        },
    };
}();


var sonArrierePlan = document.querySelector("#sonArrierePlan");
var butMute = document.querySelector('#mute');
butMute.addEventListener('click', () => {
    sonArrierePlan.pause();
});

var reactSon = document.querySelector('#son');
reactSon.addEventListener('click', () => {
    sonArrierePlan.play();
})

var containerCube = document.querySelector('#cubeRightPanel');
var profondeurSaved = 4;


/***here**/
var container, stats;

var camera, scene, renderer;
var cube, plane;
var targetRotation = 0;
var targetRotationOnMouseDown = 0;
var mouseX = 0;
init();
animate();

function init() {
    container = document.querySelector("#cubeRightPanel");
    var info = document.createElement('div');
    info.style.position = 'absolute';
    info.style.textAlign = 'center';
    container.appendChild(info);
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.y = 80;
    camera.position.z = 500 / 2;
    scene = new THREE.Scene();
    var geometry = new THREE.CubeGeometry(100, 50, 100);
    for (var i = 0; i < geometry.faces.length; i += 2) {
        var hex = Math.random() * 0xffffff;
        geometry.faces[i].color.setHex(hex);
        geometry.faces[i + 1].color.setHex(hex);
    }
    var material = new THREE.MeshBasicMaterial({
        vertexColors: THREE.FaceColors,
        overdraw: 0.5
    });
    cube = new THREE.Mesh(geometry, material);
    cube.position.y = 80;
    scene.add(cube);
    // Plane
    var geometry = new THREE.PlaneBufferGeometry(100, 100);
    geometry.rotateX(-Math.PI / 2);
    var material = new THREE.MeshBasicMaterial({
        color: 0xe0e0e0,
        overdraw: 0.5
    });
    plane = new THREE.Mesh(geometry, material);
    scene.add(plane);
    renderer = new THREE.CanvasRenderer();
    //renderer.setClearColor(0x0);
    renderer.setPixelRatio(canvaContainer.devicePixelRatio);
    renderer.setSize(containerCube.offsetWidth, containerCube.offsetHeight);
    container.appendChild(renderer.domElement);
    var x = 1;
    animate();

}

function animate() {
    // console.log(profondeurGeneral + "   " + profondeurSaved);
    requestAnimationFrame(animate);

    render();
}

function render() {
    // console.log('targetRotation' + targetRotation);
    if (profondeurGeneral != profondeurSaved) {
        targetRotation = 1;
        window.setTimeout(function() {
            targetRotation = 0;
        }, 100);
        profondeurSaved -= 1;
    }

    plane.rotation.y = cube.rotation.y += targetRotation * 0.13244;
    renderer.render(scene, camera);
}
/**to here***/

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
