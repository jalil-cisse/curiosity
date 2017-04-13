var pass1;
var pass1;
var pass2;
var newPass;
var confPass;
//On recupère le premier mot de passe
var verifPass1=document.getElementById('verifPass1');
verifPass1.onchange=function(){
	pass1=verifPass1.value;
}

var verifNewPass=document.getElementById('verifNewPass');
verifNewPass.onchange=function(){
	newPass=verifNewPass.value;
}

//On recupère le deuxième mot de passe
var verifPass2=document.getElementById('verifPass2');
verifPass2.onchange=function(){
	pass2=verifPass2.value;
}

var verifConfPass=document.getElementById('verifConfPass');
verifConfPass.onchange=function(){
	confPass=verifConfPass.value;
}

//Cette fonction permet de vérifier si les mots de passe sont identiques
function verifPass(pwd1,pwd2){
    if(pwd1==pwd2){
        return true;
    }else{
        return false;
    }
}

//Si les mots de passe sont identiques on valide le formulaire sinon on personnalise le message d'erreur
var verifForm=document.getElementById('verifForm');
verifForm.addEventListener("submit",function(e){
    var passV=verifPass(pass1,pass2);
    if(!(passV)){
        verifPass2.setCustomValidity("Vous n'avez pas saisi les mêmes mot de passe");
        verifPass2.addEventListener("keyup",function(){
        	verifPass2.setCustomValidity("");
        });
        e.preventDefault();
    }
});

var verifFormForget=document.getElementById('verifFormForget');
verifFormForget.addEventListener("submit",function(e){
    var passV=verifPass(newPass,confPass);
    if(!(passV)){
        verifConfPass.setCustomValidity("Vous n'avez pas saisi les mêmes mot de passe");
        verifConfPass.addEventListener("keyup",function(){
        	verifConfPass.setCustomValidity("");
        });
        e.preventDefault();
    }
});

var input = document.querySelectorAll('input');

for(var i = 0; i < input.length; i++) {
  input[i].onfocus = focus;
  input[i].onblur = unFocus;
}

function focus(e) {  
  var parent = e.target.parentElement;
  var brother = e.target.previousElementSibling;
  
  parent.classList.add('focused'); 
  brother.classList.add('active', 'active-color');
}

function unFocus(e) {  
  var parent = e.target.parentElement;
  var brother = e.target.previousElementSibling;
  
  parent.classList.remove('focused');
  if(e.target.value === '')
    brother.classList.remove('active', 'active-color');
  else
    brother.classList.remove('active-color');
}

/** Inspiré de Sign-Up/Login Form de Eric sur code pen***/
$('.tab a').on('click', function (e) {
  
  e.preventDefault();
  
  $(this).parent().addClass('active');
  $(this).parent().siblings().removeClass('active');
  
  target = $(this).attr('href');

  $('.tab-content > div').not(target).hide();
  
  $(target).fadeIn(600);
  
}); 

var operande1 = Math.trunc(Math.random()*10);
var operande2 = Math.trunc(Math.random()*10);
console.log('val 1 : '+ operande1 + ' ' +operande2);
var operande1Dom = document.createTextNode(operande1.toString());
var operande2Dom = document.createTextNode(operande2.toString());
var dom1 = document.querySelector('#operande1');
var dom2 = document.querySelector('#operande2');
dom1.appendChild(operande1Dom);
dom2.appendChild(operande2Dom);
var resultat = document.querySelector('#result');
console.log(resultat.value);
var submitButton = document.querySelector('#submitButton');

submitButton.addEventListener('click', (evt)=>{
  if(operande1+operande2 != resultat.value){
    evt.preventDefault();
    alert('Verifiez votre reponse!');
    window.location.reload();
  }
})