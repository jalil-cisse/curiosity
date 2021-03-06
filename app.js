/**
 * Module: AWS
 * 
 * @project Curiosity
 * 
 * Framework utilisé : Node
 * 
 * Auteurs:
 *      @author CISSE Hamidou Abdoul Jalil
 *      @author TAPSOBA Pazisnéwendé Aubain
 */
 
 /**
  * connectes contient les informations sur
  * tous les utilisateurs en ligne.
  * @type {Objet}
  */
var connectes = {};

/**
 * Dans le cadre du projet nous avons utilisé les modules:
 * - express
 * - body-parser
 * - cookie-parser
 * - express-session pour la gestion des sessions
 * - uws et http pour l'utilisation du WebSocket
 * - bcrypt pour le hashage du mot de passe
 * - semaphore pour éviter que deux joueurs rentrent en même temps dans une section critique
 * - mongoose pour la gestion de notre Base de données NoSQL
 * - twig pour la gestion du template
 */

/**************************** Importation Modules **************************/

var express = require('express');
var bodyP = require('body-parser');
var cookieP = require('cookie-parser');
var session = require('express-session');

/********** WEBSOCKET **********/
var http = require('http');
var ws = require('ws');

/********** BCRYPT ************/
var bcrypt = require('bcrypt');
const saltRounds = 10;

/********* Semaphore *********/
var sem = require('semaphore')(1);

/************ Mongoose ***************/
var mongoose = require('mongoose');

/**********moteur de templating Twig**********/
var twig = require('twig');

/********* Cluster ***********/
/*var cluster= require('cluster');
var numCPUs= require('os').cpus().length;
cluster.setupMaster({
  exec: 'worker.js',
  args: ['--use', 'https'],
  silent: true
});*/

/****************************************************************************/

var app = express();
app
    .use(bodyP.urlencoded({
        extended: false
    }))
    .use(cookieP());
app.use('/static', express.static('static'));

// On configure le dossier contenant les templates
// et les options de Twig
app
    .set('views', 'templates')
    .set('twig options', {
        autoescape: true
    });

/*********************** Configuration de la session **********************/

var storageSess = session({
    secret: '1A2b3c4d5e9Z',
    name: 'sessionID',
    resave: false,
    saveUninitialized: false
});
app.use(storageSess);

/***********************************************************************/


/*********** Configuration et initialisation de Mongoose **************/

 // Pour la connection
mongoose.connect('mongodb://localhost/curiosity');
var db = mongoose.connection;

// Définition du schémas de la base de données
var curioSchema = mongoose.Schema({
    nom: String,
    prenom: String,
    pseudo: String,
    email: String,
    pass: String,
    scoreActu: Number,
    bonnus: {
        grosDoigt: Number,
        sudo: Number
    }

});

//Compilation de notre model (correspondant à une table en relationnel)
var Joueur = mongoose.model('Joueur', curioSchema);


//Pour vérifier qu'on est bien connecté à la base de données
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Je suis connecté');
});

/***********************************************************************/

/******************* Nos gestionnaires commencent ici ******************/

/** Gestionnaire pour la direction vers l'authentification
 */
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/static/index.html');
});


/**Gestionnaire pour l'authentification du joueur
 */
app.post('/login', (req, res) => {

    //Requête preparée permettant de chercher le pseudo saisi dans la BD
    var query = Joueur.find({
        pseudo: req.body.nom_joueur
    });

    //Exécution de la requête
    query.exec((err, result) => {
        if (err) {
            console.log('\n Erreur sur find: ' + err);
            res.status(500).send(err);
        }
        if (result.length >= 1) {
            
            //Verification du mot de passe Hasher
            bcrypt.compare(req.body.pwd, result[0].pass, (err, resVerif) => {

                if (resVerif) {
                    //Stockage session du nouveau joueur et redirection vers /espacejeu
                    req.session.pseudo = req.body.nom_joueur;

                    //Mise à jour de l'objet connectes
                    connectes[req.body.nom_joueur] = {
                        time: new Date(),
                        statut: null,
                        scoreActu: result[0].scoreActu,
                        grosDoigt: result[0].bonnus.grosDoigt,
                        sudo: result[0].bonnus.sudo
                    };
                    res.redirect('/espacejeu');
                }
                else {
                    console.log('MDP incorect');
                    res.render('index.twig', {
                        'erreurPwd': true
                    });
                }
            });
        }
        else {
            console.log('Pseudo non reconnu');
            res.render('index.twig', {
                'erreurCompt': true
            });
        }
    });
});

/**Gestionnaire pour éviter l'erreur: "cannot get /login"
 */
app.get('/login', (req, res) => {
    res.redirect('/');
});

/**Gestionnaire pour la création de compte du joueur
 */
app.post('/signin', (req, res) => {

    var query = Joueur.find({
        pseudo: req.body.pseudo
    });
    //Vérification s'il n'y a pas le même Pseudo avant de l'enregistrer
    query.exec((err, result) => {
        if (err) {
            console.log('\n Erreur sur find: ' + err);
            res.status(500).send(err);
        }
        /**Si le pseudo existe on réaffiche la page d'authentification avec un
         *message spécifiant que le Pseudo ou le mot de passe existe déjà
         */
        else if (result.length >= 1) {
            res.render('index.twig', {
                'duplica': true
            });

        }
        //Il n'existe pas, donc on l'ajoute dans la BD avant de le rediriger
        else {
            //Pour hacher le MDP
            bcrypt.hash(req.body.pass2, saltRounds, (err, hash) => {
                //Insertion du nouveau joueur dans la BD
                var nouvJoueur = new Joueur({
                    nom: req.body.nom,
                    prenom: req.body.prenom,
                    pseudo: req.body.pseudo,
                    email: req.body.email,
                    pass: hash,
                    scoreActu: 0,
                    bonnus: {
                        grosDoigt: 1,
                        sudo: 0
                    }
                });

                //Sauvegarde dans la BD
                nouvJoueur.save((err) => {
                    if (err) {
                        console.log('\nErreur d\'enregistrement dans la BD ' + err);
                    }
                });
        
                //Stockage session du nouveau joueur et redirection vers /espacejeu
                req.session.pseudo = req.body.pseudo;

                //Mise à jour de l'objet connectée
                connectes[req.body.pseudo] = {
                    time: new Date(),
                    statut: null,
                    scoreActu: 0,
                    grosDoigt: 1,
                    sudo: 0
                };
                res.redirect('/espacejeu');
                console.log('\nEnregistrement du new joueur');
            });
        }
    });

});

/**Gestionnaire pour éviter l'erreur: "cannot get /signin"
 */
app.get('/signin', (req, res) => {
    res.redirect('/');
});

/**
 * Gestionnaire pour la reinitialisation du mot de passe
 */
 app.post('/forgetPass', (req, res) => {
     //Requête preparée permettant de chercher le pseudo saisi dans la BD
     var query = Joueur.find({
         nom: req.body.fname,
         prenom: req.body.lname
     });
 
     //Exécution de la requête
     query.exec((err, result) => {
         if (err) {
             console.log('\n Erreur sur find: ' + err);
             res.status(500).send(err);
         }
         if (result.length >= 1) {
             //Pour hacher le MDP
             bcrypt.hash(req.body.confPass, saltRounds, (err, hash) => {
 
                 //Insertion du nouveau mot de passe
                 result[0].pass = hash;
 
                 //Sauvegarde dans la BD
                 result[0].save((err) => {
                     if (err) {
                         console.log('\n ReinitialisationMDP-Erreur d\'enregistrement dans la BD ' + err);
                     }
                 });
                 res.redirect('/');
             });
         }
         else {
             console.log('Nom et prenom non reconnu');
             res.render('index.twig', {
                 'errPseudo': true
             });
         }
 
     });
});
 
/**Gestionnaire pour éviter l'erreur: "cannot get /forgetPass"
 */
app.get('/forgetPass', (req, res) => {
    res.redirect('/');
});

/**Gestionnaire pour l'espace jeu
 */
app.get('/espacejeu', (req, res) => {

    //On verifie si je joueur est connecté avant de charger la page
    if (req.session.pseudo in connectes) {
        var i = 0;
        var result = [];
        for (var pseudo in connectes) {
            if(pseudo!=req.session.pseudo){
                result[i] = {
                    pseudo: pseudo,
                    scoreActu: connectes[pseudo].scoreActu,
                    grosDoigt: connectes[pseudo].grosDoigt,
                    sudo: connectes[pseudo].sudo
                };
                i++;
            }
        }
        //Pour trier par ordre croissant des scores
        result.sort((a, b) => {
            return b.scoreActu - a.scoreActu;
        });
        res.render('espaceJeuWS1.twig', {
            'joueur': result,
            'joueur_actu': req.session.pseudo,
            'bonusGD' : connectes[req.session.pseudo].grosDoigt,
            'bonusSUDO' : connectes[req.session.pseudo].sudo,
            'scoreJoueur' : connectes[req.session.pseudo].scoreActu
        });
    }
    else {
        res.redirect('/');
    }
});

/**
 * Gestionnaire pour permettre au joueur de voir son profil
 */
 app.get('/profile', (req, res)=>{
    
    if(req.session.pseudo in connectes){
        res.render('profile.twig', {
            'session' : req.session.pseudo,
            'points' : connectes[req.session.pseudo].scoreActu, 
            'sudo' : connectes[req.session.pseudo].sudo,
            'gd' : connectes[req.session.pseudo].grosDoigt
        });
    }else{
        res.redirect('/');
    }
    
});

/**Gestionnaire pour la deconnexion du joueur
 */
app.get('/logout', (req, res) => {
    res.redirect('/');
});
/***********************************************************************/

/***************************** WEBSOCKET ******************************/

// On attache le serveur Web Socket au même serveur qu'Express
var server = http.createServer(app);
var wsserver = new ws.Server({
    server: server,
    // Ceci permet d'importer la session dans le serveur WS, qui
    // la mettra à disposition dans wsconn.upgradeReq.session, voir
    // https://github.com/websockets/ws/blob/master/examples/express-session-parse/index.js
    verifyClient: (info, callback) => {
        storageSess(info.req, {}, () => {
            callback(info.req.session.pseudo !== undefined, 403, "Unauthorized");
        });
    },
});

/**Broadcast à tous les joueurs
*/
// Broadcast à tous les joueurs
wsserver.broadcast = (data) => {
    wsserver.clients.forEach((client) => {
        if (client.readyState === ws.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

//Broadcast à tous les joueurs sauf à celui initiateur du broadcast
wsserver.broadcastEve = (wsConn, data) => {
    wsserver.clients.forEach((client) => {
        if (client !== wsConn && client.readyState === ws.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};
/**Le tableau save_destroy contient tous les cubes détruits
 * @var {Array} save_destroy
 * 
 * La variable profondeur correspond à la hauteur(profondeur) du cube construit
 * @var {Number} profondeur
 * 
 * La variable cube_count permet de compter le nombre de cube detruit
 * @var {Number} cube_count
 */
var save_destroy = [];
var profondeur = 4; //19
var cube_count = 0;

// On définit la logique de la partie Web Socket
wsserver.on('connection', (wsconn) => {
    
    //Contenant les informations sur la session
    var session = wsconn.upgradeReq.session;
    
    /**
     * La fonction retourne un Objet contenant:
     * @param {String} statut correspondant au statut du joueur (null, jouer, logout, ancJoueur, newJoueur)
     * @param {Object} current_objet correspondant au coordonnée du cube détruit
     * @param {Object} infoJoueurActu contenant les informations (scorActu, gdActu, sudoActu) sur le joueur actuel
     * @param {Array} infoAutreJoueurs contenant les informations (pseudo, scoreActu) sur les autres joueurs
     * @function
     * @name envoiInfoJoueurs
     * @returns {Object}
     */
    function envoiInfoJoueurs() {
        var resultat = {
            statut: '',
            current_objet: {},
            infoJoueurs: []
        };

        resultat.current_objet = connectes[session.pseudo].current_objet;
        resultat.statut = connectes[session.pseudo].statut;

        //Cette vérification est faite pour supprimer le joueur de l'objet
        //connectes lorsqu'il se deconnecte
        if (connectes[session.pseudo].statut == 'LOGOUT') {
            delete connectes[session.pseudo];
        }
        
        var i = 0;
        for (var pseudo in connectes) {
                resultat.infoJoueurs[i] = {
                    pseudo: pseudo,
                    scoreActu: connectes[pseudo].scoreActu,
                    grosDoigt: connectes[pseudo].grosDoigt,
                    sudo: connectes[pseudo].sudo
                };
                i++;  
        }
            
        return resultat;
    }

    //On rentre dans cette condition dès qu'un nouveau joueur se connecte
    if (session.pseudo in connectes && (connectes[session.pseudo].statut == null || connectes[session.pseudo].statut == 'ancJoueur')) {
        
        //On crée l'objet newJoueur contenant les cubes détruits
        var newJoueur = {
            statut: 'newJoueur',
            pseudo: session.pseudo,
            destroyedSave: save_destroy
        };
        
        //On envoi ce message au joueur pour qu'il affiche l'etat actuel du cube
        wsconn.send(JSON.stringify(newJoueur));
        
        if (connectes[session.pseudo].statut == null) {
            connectes[session.pseudo].statut = 'ENLIGNE';
            
            //On fait un broadcast, pour annoncer la venue d'un nouveau joueur 
            var listeJoueur = envoiInfoJoueurs();
            wsserver.broadcast(listeJoueur);
        }
    }

    /**************A la reception de message des joueurs************/
    
    wsconn.on('message', (data) => {
        console.log('\nDATA: ' + data);
        var DATA = JSON.parse(data);
        var condIf = true;
        switch (DATA.action) {
            case 'jouer':
                
                //On applique l'idée des semaphores en utilisant sem.take()
                //Pour empêcher que eux joueurs accèdent en même temps au contenu critique du cas 'jouer'
                sem.take(() => {
                    
                    //On fait cette vérification pour empêcher la destruction du cube
                    //se situant sur la couche qui suit
                    if (profondeur == DATA.currentDestroyed.profondeurObj) {
                        
                        //Pour empêcher la destruction d'un même cube par deux joueurs en même temps
                        //On vérifie si le cube qu'on veux détruire n'a pas été déjà détruit auparavant
                        //S'il n'a pas été détruit alors condIf passe à true et on détruit le cube
                        //Sinon condIf passe à false et on ne détruit rien
                        if (save_destroy.length > 0) {
                            if (DATA.currentDestroyed.id != save_destroy[save_destroy.length - 1].id) {
                                condIf = true;
                            }
                            else {
                                condIf = false;
                            }

                        }

                        if (condIf) {
                            connectes[session.pseudo].scoreActu += 5;
                            connectes[session.pseudo].statut = 'JOUER';
                            
                            //On sauvegarde les coordonnées du cube détruit
                            save_destroy.push(DATA.currentDestroyed);
                            
                            //On ajoute les coordonnées du cube détruit par le joueur dans l'objet
                            //connectes, pour pouvoir envoyé à tous les autres joueurs le cube détruit
                            connectes[session.pseudo].current_objet = DATA.currentDestroyed;
                            var listeJoueur = envoiInfoJoueurs();
                            wsserver.broadcast(listeJoueur);
                            
                            //On incrémente cube_count et on vérifie si la première couche a été
                            //complètement détruit. Si oui on décremente la profondeur et on
                            //reinitialise cube_count à zero, sinon on ne fait rien.
                            cube_count++;
                            if (cube_count == 25) { //Taille du cube
                                profondeur--;
                                cube_count = 0;
                            }
                        }
                    }
                    //On libère la section critique
                    sem.leave();
                });
                
                //Vérification pour voir si la partie est finie
                if (profondeur == -1 && cube_count == 0) {
                    //Pour chercher le gagnant
                    // var win=[];
                    // var i=0;
                    //Rénitialisation de l'objet connectes et initialisation de la table win
                    for (var pseudo in connectes) {
                        // win[i]={
                        //     winner: pseudo,
                        //     meilleurScore: connectes[pseudo].scoreActu
                        // };
                        connectes[pseudo] = {
                            time: new Date(),
                            statut: null,
                            scoreActu: 0,
                            grosDoigt: 1,
                            sudo: 0
                        };
                        // i++;
                    }
                    
                    //Pour avoir le meilleur score et le nom du gagnant on fait un tri sur win
                    // win.sort((a, b) => {
                    //     return b.meilleurScore - a.meilleurScore;
                    // });
                    
                    //On envoi le gagnant à tout les joueurs en ligne
                    wsserver.broadcast({
                        statut: 'WIN',
                        winner: session.pseudo,
                        score: connectes[session.pseudo].scoreActu
                    });

                    //Réinitialisation totale pour la nouvelle partie:
                    
                    //Des variables
                    save_destroy = [];
                    cube_count = 0;
                    profondeur = 4;
                    
                    //De la BD
                    Joueur.find((err, result) => {
                        if (err) {
                            console.log('Erreur Update : ' + err);
                        }
                        for (var i = 0; i < result.length; i++) {
                            result[i].scoreActu = 0;
                            result[i].bonnus.grosDoigt = 1;
                            result[i].bonnus.sudo = 0;
                            
                            result[i].save((err) => {
                                if (err) {
                                    console.log('\n Update-Erreur d\'enregistrement dans la BD ' + err);
                                }
                            });
                        }
                    });
                    
                    //Rénitialisation de l'objet connectes
                    for (var pseudo in connectes) {
                        connectes[pseudo] = {
                            time: new Date(),
                            statut: null,
                            scoreActu: 0,
                            grosDoigt: 1,
                            sudo: 0
                        };
                    }
                    
                }
                break;
            
            //Achat du bonnus grosDoigt pour détruire 4 cubes en même temps
            case 'achatBonusGD':
                if(connectes[session.pseudo].scoreActu>=30){
                    connectes[session.pseudo].grosDoigt++;
                    connectes[session.pseudo].scoreActu-=30;
                    connectes[session.pseudo].statut='ACHATGD';
                    var listeJoueur=envoiInfoJoueurs();
                    wsserver.broadcast(listeJoueur);
                    console.log('ACHATGD');
                }else{
                    wsconn.send(JSON.stringify({
                        statut: 'NONACHATGD'
                    }));
                }
                
            break;
            
            //Achat du bonnus sudo pour que le joueur soit le seul à cliquer
            //pendant 10s
            case 'achatBonusSUDO':
                if(connectes[session.pseudo].scoreActu>=60){
                    connectes[session.pseudo].sudo++;
                    connectes[session.pseudo].scoreActu-=60;
                    connectes[session.pseudo].statut='ACHATSUDO';
                    listeJoueur=envoiInfoJoueurs();
                    wsserver.broadcast(listeJoueur);
                    console.log('ACHATSUDO');
                }else{
                    wsconn.send(JSON.stringify({
                        statut: 'NONACHATSUDO'
                    }));
                }
                
            break;
            
            //Utilisation du bonnus gros doigt   
            case 'bonusGD':
                
                if(connectes[session.pseudo].grosDoigt > 0){
                    connectes[session.pseudo].grosDoigt --;
                    wsconn.send(JSON.stringify({
                        statut : 'CONFGD',
                        infoJoueurs: {
                            grosDoigt: connectes[session.pseudo].grosDoigt,
                            sudo: connectes[session.pseudo].sudo
                        }
                    }));
                    console.log('BONNUSGD');
                }else{
                    wsconn.send(JSON.stringify({
                        statut : 'NONCONFGD'
                    }));
                }
                break;
            
            //Utilisation du bonnus sudo
            case 'bonusSUDO':
                sem.take(() => {
                    if(connectes[session.pseudo].sudo > 0){
                        connectes[session.pseudo].sudo --;
                        wsconn.send(JSON.stringify({
                            statut : 'CONFSUDO',
                            player : session.pseudo,
                            infoJoueurs: {
                                grosDoigt: connectes[session.pseudo].grosDoigt,
                                sudo: connectes[session.pseudo].sudo
                            }
                        }));
                        //connectes[session.pseudo].statut='MODSUDO';
                        //var listeJoueur=envoiInfoJoueurs();
                        //wsserver.broadcastEve(wsconn,listeJoueur);
                        wsserver.broadcastEve(wsconn,{
                            statut : 'MODSUDO',
                            player : session.pseudo
                        });
                        console.log('BONNUSSUDO');
                    }else{
                        wsconn.send(JSON.stringify({
                            statut : 'NONCONFSUDO'
                        }));
                    }
                 sem.leave();
                });
                break;
                
            case 'exit':
                connectes[session.pseudo].statut = 'LOGOUT';
                break;
                
            default:
                // code
                console.log("Erreur d'interprétation sur le message reçu");
        }
    });
    
        /************** Fermeture de la connexion ************/

    wsconn.on('close', () => {
        
        //Lorsqu'on détecte une fermeture de la connexion on sauvegarde
        //Les données du joueur dans la BD
        
        var query = Joueur.find({
            pseudo: session.pseudo
        });
    
        query.exec((err, result) => {
            if (err) console.log('Requête pour deconnexion: ' + err);

            if (result.length == 1 && connectes[session.pseudo]) {
                result[0].scoreActu = connectes[session.pseudo].scoreActu;
                result[0].bonnus.grosDoigt = connectes[session.pseudo].grosDoigt;
                result[0].bonnus.sudo = connectes[session.pseudo].sudo;

                result[0].save((err) => {
                    if (err) {
                        console.log('\n Deconnexion-Erreur d\'enregistrement dans la BD ' + err);
                    }
                });

                //On fait cette vérification pour voir si c'est une deconnexion normal
                //ou anormal(perte de connexion, fermeture de la fenètre du jeu).
                //Si c'est une deconnexion normal on fait un broadcast aux joueurs
                //pour qu'ils retirent le joueurs qui se deconnecte de la liste des
                //joueurs en ligne. Sinon on change son statut en 'ancJoueur' dans 
                //l'objet connectes
                if (connectes[session.pseudo].statut == 'LOGOUT') {
                    var listeJoueur = envoiInfoJoueurs();
                    wsserver.broadcastEve(wsconn, listeJoueur);
                }
                else {
                    connectes[session.pseudo].statut = 'ancJoueur';
                }
            }
        });
    });
});

// On lance le serveur HTTP/Web Socket
server.listen(process.env.PORT);
/*if(cluster.isMaster){
    console.log(`Master ${process.pid}`);
    //Création des Workers
    for(var i=0; i<numCPUs;i++){
        cluster.fork();
    }
    
    cluster.on('exit',(worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`+'avec code: '+code);
    });
}else{
    //Workers partageant le serveur HTTP/Web Socket
    server.listen(process.env.PORT);
    console.log(`Worker ${process.pid} started`);
}*/
