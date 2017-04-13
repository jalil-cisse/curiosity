/**
 *@var ws {instanceWebsocket} Instance du websocket.
 */
var ws= new WebSocket('wss://' + window.location.host);

/**
 * L'objet curiosity contient l'interface du jeu et son état
 */
var curiosity = {
    /**
     * Variable globale contenant les ID des cubes non supprimés.
     * @var {Array} tabID
     */
    tabId: [],

    /**
     * Contient true si bonus et false sinon.
     * @var {bool} bonGD
     */
    bonGD: false,
    nbClic: 0,
    pseudo: '',
    /**
     * Selectionne le noeud table, afin de faire les MAJ
     */
    div: document.querySelector('#result table'),

    /**
     * Selectionne le noeud buttBonus pour envoyer un message au serveur
     * permettant au joueur d'utiliser son Bonnus gros doigt
     */
    butBonusGrosDoigt: document.querySelectorAll('.buttBonus')[0],

    /**
     * Selectionne le noeud buttBonus pour envoyer un message au serveur
     * permettant au joueur d'utiliser son Bonnus gros doigt
     */
    butBonusSudo: document.querySelectorAll('.buttBonus')[1],

    /**
     * Fonction init permet l'initialisation du jeu et la MAJ des données des joueurs
     * prend en paramètre un élément du DOM ou l'on souhaite généré l'interface du jeu
     * et un autre élément (body) lors du chargement de la page
     * @param {element} chargement element associé à l'évènement onload
     * @param {Number} dim_cube pour la dimension du cube
     * @param {element} interfaceJeu element associé au chargement du jeu
     * @param {element} paPer element raphael 
     */

    init: function(chargement, cube_dim, interfaceJeu,paPer) {
        var self=this;
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
                        if (data.destroyedSave) {
                            for (var i = 0; i < data.destroyedSave.length; i++) {
                                console.log('DANS FOR:' + data.destroyedSave[i]);
                                self.tabId.splice(self.indice(data.destroyedSave[i]), 1);
                                self.dropeById(data.destroyedSave[i], paPer);
                            }
                        }

                        break;

                    case 'ENLIGNE':
                        self.majAllPlayer(data);
                        console.log('ENLIGNE-ChargePage');
                        break;

                    case 'LOGOUT':
                        self.majAllPlayer(data);
                        break;

                    case 'JOUER':

                        console.log(self.bonGD);

                        //changement du cube courant
                        self.tabId.splice(self.indice(data.current_objet), 1);
                        self.dropeById(data.current_objet, paPer);
                        self.majAllPlayer(data);

                        //console.log('longueur tableau' +tabId.length);
                        if (self.bonGD && self.nbClic > 0) {

                            var i = self.tabId.length - 1;
                            var msg = {
                                action: 'jouer',
                                currentDestroyed: self.tabId[i]
                            };

                            //envoie du message au serveur
                            ws.send(JSON.stringify(msg));
                            self.nbClic--;
                            if (self.nbClic == 0)
                                self.bonGD = false;

                        }
                        break;

                    case 'WIN':
                        //Inspiré de Smart Welcome Popup de Harjeet Singh sur code pen.
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
                        self.majAllPlayer(data);
                        break;

                    case 'NONACHATGD':
                        alert("Vous avez besoin de 30 points pour l'achat de ce Bonnus");
                        break;
                        
                    case 'ACHATSUDO':
                        self.majAllPlayer(data);
                        break;

                    case 'NONACHATSUDO':
                        alert("Vous avez besoin de 60 points pour l'achat de ce Bonnus");
                        break;

                    case 'CONFGD':
                        self.bonGD = true;
                        self.nbClic = 3;
                        self.majCurentPlayer(data);
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
                        self.majCurentPlayer(data);
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
                        break;

                    default:
                        alert('Erreur du connexion, Veuillez réessayer');
                }
            });
        });

        chargement.onload = self.creerCube(interfaceJeu, cube_dim, paPer);

        self.butBonusGrosDoigt.addEventListener('click', (evt) => {
            ws.send(JSON.stringify({
                action: 'bonusGD'
            }));
        });

        self.butBonusSudo.addEventListener('click', (evt) => {
            ws.send(JSON.stringify({
                action: 'bonusSUDO'
            }));
        });
    },

    /** Fonction permettant de créer un nouveau noeud
     * @param {element} parent element parent.
     * @param {element} balise element a accrocher au parent.
     */
    ajoute: function(parent, balise){
        return parent.appendChild(document.createElement(balise));
    },

    /**Pour la generation de la liste des utilisateurs.
     *@param {Object} data Objet transmis par le serveur.
     */
    majAllPlayer: function(data) {
        var result = data;
        /*************** Tri par ordre croissant du score ***************************/
        result.infoJoueurs.sort(function(a, b) {
            return b.scoreActu - a.scoreActu;
        });

        /* Update du tableau*/
        this.div.innerHTML = '';
        
        var tr = this.ajoute(this.div, 'tr');

        //Th Joueurs
        var th = this.ajoute(tr, 'th');
        th.appendChild(document.createTextNode('Joueurs'));

        //Th Score
        th = this.ajoute(tr, 'th');
        th.appendChild(document.createTextNode('Score'));

        //Affichage contenu du data
        for (var i = 0; i < result.infoJoueurs.length; i++) {
    
            if (this.pseudo == result.infoJoueurs[i].pseudo) {
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
    
                tr = this.ajoute(this.div, 'tr');
                //Insertion Joueur i 
                var td = this.ajoute(tr, 'td');
                var joueur = document.createTextNode(result.infoJoueurs[i].pseudo);
                td.appendChild(joueur);
    
                //Insertion Score
                td = this.ajoute(tr, 'td');
                var score = document.createTextNode(result.infoJoueurs[i].scoreActu);
                td.appendChild(score);
            }
    
        }
    },

    /**
     * Pour mettre à jour le nombre de bonnus d'un joueur
     * utilisant son bonnus
     * @param {Object} data Objet transmis par le serveur.
     */
    majCurentPlayer: function(data) {
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
    },

    /** Fonction permettant de rechercher un indice dans un tableau connaissant sa valeur
     *@param {Object} objet element parent.
     *@return {number} indice indice de l'element dans le tableau
     */
    indice: function(objet) {
        for (var i = 0; i < this.tabId.length; i++) {
            if (this.tabId[i].id == objet.id)
                return i;
        }
    },

    /** Fonction pour la deconnexion envoie un message de deconnexion exit au serveur
     *@constructor
     */
    exit: function() {
        var msg = {
            action: 'exit'
        };
        ws.send(JSON.stringify(msg));
    },

    /** Fonction permettant de créer l'espace Jeu
     * @function creerCube
     * @param {element} parent element parent.
     * @param {number} arrete dimension du cube.
     */

    creerCube: function(Element, dimCube, paper1) {

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
                    console.log(rectangle[k][i][j].id);
                    console.log(rectangle[k][i][j].node.id);

                    //ajout de l'identifiant du tableau a tabID
                    this.tabId.push({
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
                        console.log('COORD: ' + coordonnes.id);
                    };
                }
            }
        }
    },

    /** Fonction permettant de supprimer les cubes selon leur ID
     * @param {Object} coordo Object avec un attribut id permettant de supprimer un cube.
     * @param {paper} paper Canvas d'un objet Raphael.
     */
    dropeById: function(coordo, paper1) {
        var aSupprimer = paper1.getById(coordo.id);
        aSupprimer.remove();
    }
    
};


var body = document.querySelector("#bodydiv");
/**
     * Ici initialisation de Raphael et creation d'un canvas.
     * @Raphael
     * @param {element} body - l'element auquel sera rattaché le canvas
     * @param {int}  largeur - largeur du canvas.
     * @param {int} longueur - longueur du canvas.
     */
var paper= Raphael(canvaContainer, 700, 700); //canvas associé 

curiosity.init(body, 5, document.querySelector("#canvaContainer"),paper);

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
});

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