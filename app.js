var connectes = {};
/*** WEBSOCKET ***/
var http = require('http');
var ws = require('uws');

/******* BCRYPT************/
var bcrypt = require('bcrypt');
const saltRounds = 10;

/**************Semaphore*****************/
var sem = require('semaphore')(1);
var express = require('express');
var bodyP = require('body-parser');
var cookieP = require('cookie-parser');
var session = require('express-session');
var mongoose = require('mongoose');

//le moteur de templating Twig
var twig = require("twig");


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

//Configuration de la session
var storageSess = session({
    secret: '1A2b3c4d5e9Z',
    name: 'sessionID',
    resave: false,
    saveUninitialized: false
});
app.use(storageSess);
// Fin de la configuration de la session
/******************************************Evènement*****************************************************/

// On crée l'émetteur d'événements
//var an_emitter = new evt.EventEmitter();

/*********************************Configuration de Mongoose***********************************************/

//Configuration de mongoDB pour la connection et la
//définition du schémas de notre BD
mongoose.connect('mongodb://localhost/curiosity');
var db = mongoose.connection;

//Schémas de notre BD
var curioSchema = mongoose.Schema({
    nom: String,
    prenom: String,
    pseudo: String,
    email: String,
    sexe: String,
    pass: String,
    scoreActu: Number,
    meilleurScore: Number,
    gagnees: Boolean

});

//Compilation de notre model (correspondant à une table en relationnel)
var Joueur = mongoose.model('Joueur', curioSchema);

//Fin de configuration

//Pour vérifier qu'on est bien connecté à la BD
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    // we're connected!
    console.log('Je suis connecté');
});
//Fin de la vérification

// Nos gestionnaires commencent ici

/*********************Gestionnaire pour la direction vers l'authentification******************/
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/static/index.html');
});

//Gestionnaire pour l'enregistrement et la redirection vers l'espace jeu
//Ce gestionnaire gère les 2 cas suivants:
// 1. L'utilisateur est déjà enregistré dans la base, donc on le dirige
//    directement sur la page du jeu
// 2. L'utilisateur est nouveau, donc après avoir renseigné son pseudo
//    en l'enregistre dans la BD et on le dirige sur la page du jeu
// Plus la gestion des sessions

app.all('/', function(req, res) {
    //var pass;
    //var hasher;
    //Pour verifier si c'est une methode de type POST
    if (req.method == 'POST') {
        //Pour être sur que le champ pseudo et mot de passe n'est pas vide
        if (req.body.nom_joueur && req.body.pwd) {

            //Requête A pour vérifier si le pseudo et le mot de passe sont bon
            var queryA = Joueur.find({
                pseudo: req.body.nom_joueur,
                pass: req.body.pwd //A enlever si on utilise BCRYPT
            });

            //Requête B afin de vérifier s'il n'y a pas le même Pseudo
            var queryB = Joueur.find({
                pseudo: req.body.nom_joueur
            });

            //Exécution de la requête A
            queryA.exec(function(err, result) {
                //Joueur.find({pseudo: req.body.nom_joueur, pass: req.body.pwd},function(err, result){
                if (err) {
                    console.log('\n Erreur sur find: ' + err);

                }
                else if (result.length >= 1) {
                    req.session.pseudo = req.body.nom_joueur;
                    connectes[req.body.nom_joueur] = {
                        time: new Date(),
                        statut: null,
                        scoreActu: result[0].scoreActu,
                        meilleurScore: result[0].meilleurScore,
                        gagnees: result[0].gagnees
                    };
                    res.redirect('/espacejeu');
                    //an_emitter.emit('maj');
                    console.log('\nLe joueur existe deja dans la BD');
                }
                else {
                    //Il n'existe pas et on va l'enregistrer mais avant
                    //Vérification s'il n'y a pas le même Pseudo avant de l'enregistrer
                    //Joueur.find({pseudo: req.body.nom_joueur},'pseudo',function(err,resultPseudo){
                    queryB.exec(function(err, resultB) {
                        if (err) {
                            console.log('\n Erreur sur find: ' + err);

                            //Si le pseudo existe on reaffiche la page d'authentification avec un
                            //message spécifiant que Pseudo ou le mot de passe existe déjà
                        }
                        else if (resultB.length >= 1) {
                            res.render('index.twig', {
                                'duplica': true
                            });

                            //Il n'existe pas, donc on l'ajoute dans la BD avant de le rediriger        
                        }
                        else {

                            var nouvJoueur = new Joueur({
                                pseudo: req.body.nom_joueur,
                                pass: req.body.pwd, //hasher
                                scoreActu: 0,
                                meilleurScore: 0,
                                gagnees: false
                            });
                            //console.log('NOUVJOUEUR: '+nouvJoueur);
                            //Sauvegarde dans la BD
                            nouvJoueur.save(function(err) {
                                if (err) {
                                    console.log('\nErreur d\'enregistrement dans la BD ' + err);
                                }
                            });

                            //Stockage session du nouveau joueur et redirection vers /espacejeu
                            req.session.pseudo = req.body.nom_joueur;
                            //req.session.scoreActu=nouvJoueur.scoreActu;
                            //req.session.meilleurScore=nouvJoueur.meilleurScore;
                            //req.session.gagnees=nouvJoueur.gagnees;
                            //config de la variable connectée
                            connectes[req.body.nom_joueur] = {
                                time: new Date(),
                                statut: null,
                                scoreActu: 0,
                                meilleurScore: 0,
                                gagnees: false
                            };
                            res.redirect('/espacejeu');
                            //an_emitter.emit('maj');
                            console.log('\nEnregistrement du new joueur');
                        }
                    });
                }
            });
        }
        else {
            console.log('\nLe champ pseudo ou password n\'a pas été renseigné');
            res.redirect('/');
        }
    }

});

/*********************Gestionnaire pour l'authentification du joueur**********************/
/*app.all('/', function(req, res) {
    //var pass;
    //var hasher;
    //Pour verifier si c'est une methode de type POST
    if (req.method == 'POST') {
        //Pour être sur que le champ pseudo et mot de passe n'est pas vide
        if (req.body.nom_joueur && req.body.pwd) {

            //Requête A pour vérifier si le pseudo et le mot de passe sont bon
            var query = Joueur.find({
                pseudo: req.body.nom_joueur
            });
            //Exécution de la requête
            query.exec(function(err, result) {
                if (err) {
                    console.log('\n Erreur sur find: ' + err);
                }
                if (result.length >= 1) {
                    //Verification du MDP Hasher
                    bcrypt.compare(req.body.pwd, result[0].pass, function(err, res) {
                        // res == true 
                        if(res){
                            req.session.pseudo = req.body.nom_joueur;
                            connectes[req.body.nom_joueur] = {
                                time: new Date(),
                                statut: null,
                                scoreActu: result[0].scoreActu,
                                meilleurScore: result[0].meilleurScore,
                                gagnees: result[0].gagnees
                            };
                            res.redirect('/espacejeu');
                        }else{
                            //Envoi un message lui specifiant que son MDP ou pseudo n'est pas correct
                            //res.render();
                            console.log('MDP incorect');
                        }
                    });
                }else{
                    //Envoi un message lui specifiant que son MDP ou pseudo n'est pas correct
                    //res.render();
                    console.log('Pseudo non reconnu');
                }
            });
        }
    }else{
        console.log('\nLe champ pseudo ou password n\'a pas été renseigné');
        res.redirect('/');
    }
});*/

/****************Gestionnaire pour la création de compte du joueur*************/
/*app.post('/signin', function(req, res) {
    if(req.body.pseudo && req.body.pass1==req.body.pass2){
        var query=Joueur.find({pseudo: req.body.pseudo});
        var hasher;
        //Vérification s'il n'y a pas le même Pseudo avant de l'enregistrer
        query.exec(function(err, resultB) {
            if (err) {
                        console.log('\n Erreur sur find: ' + err);
                        //Si le pseudo existe on reaffiche la page d'authentification avec un
                        //message spécifiant que Pseudo ou le mot de passe existe déjà
                    }else if (resultB.length >= 1) {
                           res.render('index.twig', {
                            'duplica': true
                        });
                    //Il n'existe pas, donc on l'ajoute dans la BD avant de le rediriger        
                    }else{
                        //Pour hacher le MDP
                            bcrypt.hash(req.body.pass2, saltRounds, function(err, hash) {
                              // Store hash in your password DB. 
                              hasher=hash;
                            });
                            var nouvJoueur = new Joueur({
                                nom: req.body.nom,
                                prenom: req.body.prenom,
                                pseudo: req.body.nom_joueur,
                                email: req.body.email,
                                sexe: req.body.sexe,
                                pass: hasher, //hasher
                                scoreActu: 0,
                                meilleurScore: 0,
                                gagnees: false
                            });
                            //console.log('NOUVJOUEUR: '+nouvJoueur);
                            //Sauvegarde dans la BD
                            nouvJoueur.save(function(err) {
                                if (err) {
                                    console.log('\nErreur d\'enregistrement dans la BD ' + err);
                                }
                            });

                            //Stockage session du nouveau joueur et redirection vers /espacejeu
                            req.session.pseudo = req.body.nom_joueur;
                            //req.session.scoreActu=nouvJoueur.scoreActu;
                            //req.session.meilleurScore=nouvJoueur.meilleurScore;
                            //req.session.gagnees=nouvJoueur.gagnees;
                            //config de la variable connectée
                            connectes[req.body.nom_joueur] = {
                                time: new Date(),
                                statut: null,
                                scoreActu: 0,
                                meilleurScore: 0,
                                gagnees: false
                            };
                            res.redirect('/espacejeu');
                            //an_emitter.emit('maj');
                            console.log('\nEnregistrement du new joueur');
                    }
        });
        
    }else{
        res.redirect('/');
        console.log('Erreur lors de la création du compte');
    }
    
});*/

/********************Gestionnaire pour l'espace jeu**********************************/
app.get('/espacejeu', function(req, res) {

    //Gestion des clients en lignes
    /*Joueur.find(function(err, result){
        if(err){
            console.log('\n Erreur sur find: '+err);
        }else if(req.session.pseudo in connectes){
            //var joueurTab=Object.keys(connectes);
            res.render('espaceJeu.twig', {'joueur':JSON.parse(result),
                                          'enLigne':joueurTab
                                        });
            
            
            var documentArray = myCursor.toArray();
            console.log(documentArray);
        }
    });*/

    //var query = Joueur.find();
    //query.exec(function(err, result) {
    //    if (err) return console.log(err);
    if (req.session.pseudo in connectes) {
        var i = 0;
        var result = [];
        //var joueurTab = Object.keys(connectes);
        for (var pseudo in connectes) {
            result[i] = {
                pseudo: pseudo,
                scoreActu: connectes[pseudo].scoreActu,
                meilleurScore: connectes[pseudo].meilleurScore,
                gagnees: connectes[pseudo].gagnees
            };
            i++;
        }
        //Pour trier par ordre croissant des scores
        result.sort(function(a, b) {
            return b.scoreActu - a.scoreActu;
        });
        // for(var j=0;j<result.length;j++)
        // console.log('ENLIGNE: '+ result[j].pseudo);
        res.render('espaceJeuWS1.twig', {
            'joueur': result,
            'joueur_actu': req.session.pseudo
                //'enLigne': joueurTab
        });
        //res.render('espaceJeuWS.twig');
        //console.log(result);
    }
    else {
        res.redirect('/');
    }
    //});
});

//Gestionnaire pour actualiser les joueurs en ligne
/*app.get('/api/espacejeu',function(req, res){
    var query=Joueur.find();
    query.select('pseudo scoreActu meilleurScore gagnees');//Pour selectionner les colonnes specifiques
    query.exec(function(err,result){
        if (err) return console.log(err);
        var enligne=Object.keys(connectes);
           var resultat=[];
           for(var i=0;i<result.length;i++){
               for(var j=0;j<enligne.length;j++){
                   if(result[i].pseudo==enligne[j]){
                        resultat[j]=result[i];
                    }
               }
           }
           res.json(resultat);
        //console.log(resultat);
    });
});*/

/**********************Gestionnaire pour la deconnexion du joueur***********************/
app.get('/logout', function(req, res) {
    res.redirect('/');
});

/********************************WEBSOCKET******************************************/

// On attache le serveur Web Socket au même serveur qu'Express
var server = http.createServer(app);
var wsserver = new ws.Server({
    server: server,
    // Ceci permet d'importer la session dans le serveur WS, qui
    // la mettra à disposition dans wsconn.upgradeReq.session, voir
    // https://github.com/websockets/ws/blob/master/examples/express-session-parse/index.js
    verifyClient: function(info, callback) {
        storageSess(info.req, {}, function() {
            callback(info.req.session.pseudo !== undefined, 403, "Unauthorized");
        });
    },
});

/***************************************Broadcast à tous les joueurs*************************************************/
// Broadcast to all.
wsserver.broadcast = function(data) {
    wsserver.clients.forEach(function(client) {
        if (client.readyState === ws.OPEN) {
            client.send(JSON.stringify(data));
            //console.log('CLIENT: ' + wsserver.clients);
        }
    });
};
//Broadcast to everyone
wsserver.broadcastEve = function(wsConn, data) {
    wsserver.clients.forEach(function(client) {
        if (client !== wsConn && client.readyState === ws.OPEN) {
            client.send(JSON.stringify(data));
            //console.log('CLIENT: ' + wsserver.clients);
        }
    });
};
/***********************************Pour la construction du cube*****************************************/
var save_destroy = [];
var profondeur = 4; //19
var cube_count = 0;

// On définit la logique de la partie Web Socket
wsserver.on('connection', function(wsconn) {

    var session = wsconn.upgradeReq.session; //Contenant les info sur la session
    //Pour l'envoi de la liste des utilisateurs connectés /*Utiliser l'objet connectes pour envoyer la liste*/
    function envoiListeJoueur() {
        var resultat = {
            statut: '',
            //current_prof: profondeur,
            current_objet: {},
            infoJoueur: []
        };

        resultat.current_objet = connectes[session.pseudo].current_objet;
        resultat.statut = connectes[session.pseudo].statut;
        //console.log('ETAT: '+session.pseudo +'-'+ connectes[session.pseudo].statut);
        if (connectes[session.pseudo].statut == 'LOGOUT') {
            delete connectes[session.pseudo];
            //console.log('SESSION '+session.pseudo+' SUPPRIMER');
        }
        /*var query=Joueur.find();
        
        query.select('pseudo scoreActu meilleurScore gagnees');//Pour selectionner les colonnes specifiques
        query.exec(function(err,result){
            if (err) return console.log(err);
            var enligne=Object.keys(connectes);
            for(var i=0;i<result.length;i++){
               for(var j=0;j<enligne.length;j++){
                   if(result[i].pseudo==enligne[j]){
                       var pseudo=enligne[j];
                       resultat[j]=result[i];
                       result[j].status=connectes[pseudo].status;
                    }
               }
           }
           wsconn.send(JSON.stringify(resultat));
        //console.log(resultat);
        });*/
        var i = 0;
        //console.log(connectes);
        for (var pseudo in connectes) {
            resultat.infoJoueur[i] = {
                pseudo: pseudo,
                scoreActu: connectes[pseudo].scoreActu,
                meilleurScore: connectes[pseudo].meilleurScore,
                gagnees: connectes[pseudo].gagnees
            };
            i++;
        }
        //wsconn.send(JSON.stringify(resultat));
        return resultat;
    }
    //******************************************************


    //On envoi les données de MAJ si le joueur est libre
    if (session.pseudo in connectes && (connectes[session.pseudo].statut == null || connectes[session.pseudo].statut == 'ancJoueur')) {
        //envoiListeJoueur();
        //var listeJoueur=envoiListeJoueur();
        var newJoueur = {
            statut: 'newJoueur',
            destroyedSave: save_destroy
        };
        wsconn.send(JSON.stringify(newJoueur));
        if (connectes[session.pseudo].statut == null) {
            connectes[session.pseudo].statut = 'ENLIGNE'; //Le joueur passe à l'état en ligne
            var listeJoueur = envoiListeJoueur();
            wsserver.broadcastEve(wsconn, listeJoueur);
            //console.log("\n J'envoi liste joueur: "+session.pseudo+'-'+connectes[session.pseudo].statut);
        }
    }

    /******************Réactualiser la liste des joueurs en ligne à chaque nouveau connexion******************************/
    /*an_emitter.on('maj', function() {
        //var listeJoueur = envoiListeJoueur();
        //wsserver.broadcast(listeJoueur);
        //wsserver.broadcastEve(wsconn,listeJoueur);
        //console.log('CLIENT: '+wsserver.clients);
        /*    wsserver.clients.forEach(function each(client) {
          if (client !== wsconn && client.readyState === ws.OPEN) {
            client.send(JSON.stringify(listeJoueur));
            console.log('CLIENT: '+wsserver.clients);
          }
        });
    });*/

    /****************Fermer le websocket associé au joueur et reactualiser la liste des joueurs en ligne********************/
    /*an_emitter.on('deconnecte', function(){
        connectes[session.pseudo].statut='LOGOUT';
        console.log('DECONNECTE: '+session.pseudo);
    });*/
    /*an_emitter.on('deconnecte', function(){
       //console.log('DECONNECTE: '+session.pseudo);
       /*var query = Joueur.findOne({
                pseudo: pseudo_aSupp
            });
        //var bool=false;
        //Joueur.find({pseudo: session.pseudo},function(err,result){
        query.exec(function(err,result){
           if (err) console.log('Requête pour deconnexion: '+ err);
           console.log('Deconnexion Result: '+result);
           //console.log(/*result[0].scoreActu +' et '+connectes[session.pseudo]);
           if(result.length==1){
               result[0].scoreActu=connectes[pseudo_aSupp].scoreActu;
               if(connectes[pseudo_aSupp].scoreActu > result[0].meilleurScore){
                   result[0].meilleurScore=connectes[pseudo_aSupp].scoreActu;
               }else{
                   result[0].meilleurScore=connectes[pseudo_aSupp].meilleurScore;
               }
               result[0].gagnees=connectes[pseudo_aSupp].gagnees;
               console.log('RESULT: '+result);
               
               //Sauvegarde dans la BD
               result[0].save(function(err) {
                     if (err) {
                                console.log('\n Deconnexion-Erreur d\'enregistrement dans la BD ' + err);
                        }
                        //bool=true;
                        console.log('SAUVER : ');
                });
                connectes[pseudo_aSupp].statut='LOGOUT';
                var listeJoueur = envoiListeJoueur();
                wsserver.broadcast(listeJoueur);
                console.log('SUPPRIMER');
                pseudo_aSupp='';
           }
           
            //delete connectes[session.pseudo];
            //delete connectes[pseudo_aSupp];
        });*/
    /*if(bool==true){
            delete connectes[session.pseudo];
            var listeJoueur = envoiListeJoueur();
            wsserver.broadcast(listeJoueur);
            console.log('SUPPRIMER');
        }
    });*/


    //console.log('WS connection by', session);
    //wsconn.send('Hello world!');
    //wsconn.send(JSON.stringify(resultat));

    /********************************A la reception de message des joueurs**********************************************/
    wsconn.on('message', function(data) {
        console.log('\nDATA: ' + data);
        var DATA = JSON.parse(data);
        var condIf = true;;
        //console.log('\nDATAJSON: '+DATA);
        /*var msg=JSON.parse(data);
        if(msg.adv in connectes && session.login in connectes){
            
        }*/
        switch (DATA.action) {
            case 'jouer':
                // code
                //if (connectes[session.pseudo].statut == 'ENLIGNE') {
                sem.take(() => {
                    console.log('SEM');
                    console.log('nombre de cubes detruits :' + cube_count);
                    console.log('profondeur: ' + profondeur);
                    if (profondeur == DATA.currentDestroyed.profondeurObj) {
                        console.log('PROF');
                        if (save_destroy.length > 0) {
                            console.log('SI' + save_destroy);
                            if (DATA.currentDestroyed.id != save_destroy[save_destroy.length - 1].id) {
                                condIf = true;
                                console.log('DESTROY');
                            }
                            else {
                                condIf = false;
                                console.log('SINON');
                            }

                        }

                        //}

                        if (condIf) {
                            connectes[session.pseudo].scoreActu += 5;
                            connectes[session.pseudo].statut = 'JOUER';
                            //console.log('ETAT-DANS-Jouer: '+session.pseudo+'-'+connectes[session.pseudo].statut);
                            save_destroy.push(DATA.currentDestroyed);

                            //console.log('SAVE_DESTROY: '+save_destroy);
                            connectes[session.pseudo].current_objet = DATA.currentDestroyed;
                            //console.log('COORDO: '+DATA.currentDestroyed.profondeurObj);
                            /******************Verification de la profondeur************************/

                            var listeJoueur = envoiListeJoueur();
                            cube_count++;
                            //wsconn.send(JSON.stringify(listeJoueur));
                            wsserver.broadcast(listeJoueur);
                            //console.log('cube_count: '+cube_count);

                            if (cube_count == 25) { //Taille du cube
                                profondeur--;
                                cube_count = 0;
                                //console.log('CUBE-COUNT: '+profondeur);
                            }
                        }
                        else {
                            console.log('NOTYOU: ' + session.pseudo);
                            //connectes[session.pseudo].scoreActu += 5;
                            //connectes[session.pseudo].statut = 'JOUER';
                            //console.log('ETAT-DANS-Jouer: '+session.pseudo+'-'+connectes[session.pseudo].statut);
                            // save_destroy.push(DATA.currentDestroyed);

                            // //console.log('SAVE_DESTROY: '+save_destroy);
                            // connectes[session.pseudo].current_objet = DATA.currentDestroyed;
                            // //console.log('COORDO: '+DATA.currentDestroyed.profondeurObj);
                            // /******************Verification de la profondeur************************/

                            // var listeJoueur = envoiListeJoueur();
                            // cube_count++;
                            // //wsconn.send(JSON.stringify(listeJoueur));
                            // wsserver.broadcast(listeJoueur);
                        }

                    }

                    // connectes[session.pseudo].scoreActu += 5;

                    sem.leave();
                });
                // if(profondeur==DATA.currentDestroyed.profondeurObj){
                //     connectes[session.pseudo].scoreActu += 5;
                //     connectes[session.pseudo].statut = 'JOUER';
                //     //console.log('ETAT-DANS-Jouer: '+session.pseudo+'-'+connectes[session.pseudo].statut);
                //     save_destroy.push(DATA.currentDestroyed);

                //     //console.log('SAVE_DESTROY: '+save_destroy);
                //     connectes[session.pseudo].current_objet=DATA.currentDestroyed;
                //     //console.log('COORDO: '+DATA.currentDestroyed.profondeurObj);
                //     /******************Verification de la profondeur************************/

                //         var listeJoueur = envoiListeJoueur();
                //         cube_count++;
                //         //wsconn.send(JSON.stringify(listeJoueur));
                //         wsserver.broadcast(listeJoueur);
                //         //console.log('cube_count: '+cube_count);
                //     }
                //     if(cube_count==25){ //Taille du cube
                //         profondeur--;
                //         cube_count=0;
                //         //console.log('CUBE-COUNT: '+profondeur);
                //     }
                // }
                break;

            case 'exit':
                connectes[session.pseudo].statut = 'LOGOUT';
                //console.log('DECONNECTE: '+session.pseudo);
                break;

            default:
                // code
        }
    });
    wsconn.on('close', function() {
        /*console.log('wsFERMER: '+session.pseudo);
        pseudo_aSupp=session.pseudo;
        an_emitter.emit('deconnecte');*/
        //an_emitter.removeAllListeners('deconnecte');
        //console.log("connection closed");
        var query = Joueur.find({
            pseudo: session.pseudo
        });
        //var bool=false;
        //Joueur.find({pseudo: session.pseudo},function(err,result){
        query.exec(function(err, result) {
            if (err) console.log('Requête pour deconnexion: ' + err);
            //console.log('Deconnexion Result: '+result.length);
            //console.log(/*result[0].scoreActu +' et '+*/connectes[session.pseudo]);
            if (result.length == 1 && connectes[session.pseudo]) {
                result[0].scoreActu = connectes[session.pseudo].scoreActu;
                if (connectes[session.pseudo].scoreActu >= result[0].meilleurScore) {
                    result[0].meilleurScore = connectes[session.pseudo].scoreActu;
                }
                else {
                    result[0].meilleurScore = connectes[session.pseudo].meilleurScore;
                }
                result[0].gagnees = connectes[session.pseudo].gagnees;
                //console.log('RESULT: '+result);

                //Sauvegarde dans la BD
                result[0].save(function(err) {
                    if (err) {
                        console.log('\n Deconnexion-Erreur d\'enregistrement dans la BD ' + err);
                    }
                    //bool=true;
                    //console.log('SAUVER : ');
                });
                //connectes[session.pseudo].statut='LOGOUT';
                if (connectes[session.pseudo].statut == 'LOGOUT') {
                    //console.log('SOCKET: '+connectes[session.pseudo].statut);
                    var listeJoueur = envoiListeJoueur();
                    wsserver.broadcastEve(wsconn, listeJoueur);
                    //console.log('Content CONNECTES: '+connectes);
                }
                else {
                    connectes[session.pseudo].statut = 'ancJoueur';
                    //console.log('AncienJoueur: '+connectes[session.pseudo].statut);
                }
                //Si connectes est vide et que la propriété current_objet contient des valeurs
                //alors on le reinitialise à vide.
                // if(!(connectes)){
                //     save_destroy={};
                //     console.log('CONNECTES VIDE');
                // }
            }

            //delete connectes[session.pseudo];
            //delete connectes[pseudo_aSupp];
        });
    });
    /*wsconn.on('error', function socketError() {

      console.log("connection has error");
    });*/
});

// On lance le serveur HTTP/Web Socket
server.listen(process.env.PORT);

//app.listen(process.env.PORT);
