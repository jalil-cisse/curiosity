# Projet Application Web et Sécurité : Curiosity

## Description
Jeu multijoueurs consistant en la destruction d'un grand cube constitué lui même de petits cubes. Afin de faire une demonstration de toutes les étapes du jeu,
la taille du cube général a été reduite à 5,5,5.

Le but du jeu est d'être le premier à atteindre le dernier cube.

## Description des messages échangés entre le serveur et le client

### Côté serveur

Lors de la reception du message:

* __jouer__: le serveur vérifie que c'est la bonne profondeur avant de permettre la destruction du cube concerné,
            puis il vérifie si c'est le dernier cube, si c'est le cas tout est reinitialisé et une nouvelle partie peut commencer.

* __achatBonnusGD__: vérifie tout d'abord si le joueur à suffisamment de points (30) pour l'achat de ce bonnus,
                    si c'est le cas il incrémente le nombre de bonnus et il fait une notification au joueur. Sinon
                    il le notifie qu'il n'a pas assez de points.

* __achatBonnusSUDO__: idem que pour __achatBonusGD__ seulement le nombre de point diffère (60).

* __bonusGD__: vérifie si le joueur a des bonnus gros doigt avant de l'accorder à l'utiliser, sinon il le notifie
              qu'il n'a pas de bonnusGD
              
* __bonusSUDO__: idem que pour __bonusGD__ seulement que le serveur notifie à tous les autres joueurs qu'un joueur  
                est en super joueur.
                
* __exit__: met ce joueur en mode deconnecté.

### Côté client

Lors de la reception du message: 

* __syncDimCube__: le client génère le cube en fonction de la dimension du cube reçu par le serveur.

* __newJoueur__: stock dans la variable *pseudo* le pseudo du joueur, et génère le cube en fonction
                 de l'état actuel de l'interface.

* __ENLIGNE__: met à jour la liste des joueurs en ligne avec leur points et bonnus.

* __LOGOUT__: met à jour la liste des joueurs en ligne avec leur points et bonnus (enlève le nom du joueur 
              qui c'est deconnecté).

* __JOUER__: detruit le cube concerné et il met à jour la liste des joueurs en ligne avec leur points et bonnus.

* __WIN__: affiche un popup montrant le gagnant.

* __ACHATGD__: met à jour la liste des joueurs en ligne avec leur points et bonnus

* __NONACHATGD__: affiche un alert au joueur.

* __ACHATSUDO__ : idem que __ACHATGD__.

* __NONACHATSUDO__: idem que __NONACHATGD__.

* __CONFGD__: donne la possibilité au joueur d'utiliser le bonnus gros doigt

* __NOCONFGD__: affiche une alerte au joueur pour lui notifié qu'il n'a pas de bonnus GD.

* __CONFSUDO__: donne la possibilité au joueur d'utiliser le bonnus sudo.

* __NOCONFSUDO__: affiche une alerte au joueur pour lui notifié qu'il n'a pas de bonnus GD.

* __MODSUDO__: affiche un timer chez les autres joueurs, pour dire qu'un joueur est en super joueur
               tout en les empêchant de detruire des cubes.

## Frameworks utilisés  

* __Node__  
* __Jquery__
* __Raphael__  
* __ThreeJs__
* __JsDoc__

## Ressources utilisées

* Pour les communications bidirectionnelles: __Websocket__
* Pour le dessin de l’interface de jeux : __RaphaelJs__
* Pour la persistance des données des joueurs: __MongoDB__
* Pour le cube 3D : __threeJS__

## Documentation du projet 
La documentation officielle du code source du projet est accesible depuis ce lien  <https://preview.c9users.io/lildja/curiosity/static/js/out/index.html>

## Lancement de l'application
Afin de permettre la bonne exécution du projet, il est conseiller de :

* Après avoir cloner ce depôt
* Exécuter le script *mongod* qui se trouve sur le repertoire racine "/" dans un terminal
    *Exemple: ./mongod*  

* Et enfin exécuter le fichier *app.js*

## Ameliorations futures
* Rendre le projet responsive;
* Intégration de la 3D; 
* Jeu multithreader avec des parties simultanées;
* Prise en compte des évènements (touchEvent, drag, wheel) avec écrans tactiles et la souris.

## Signaler des bugs 
* Cisse Hamidou Abdoul Jalil : jalilrocket94@gmail.com
* Tapsoba Aubain : tapsoba.aubain@gmail.com