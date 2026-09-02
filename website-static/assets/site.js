/* Azmirs shared script for inner pages */
(function(){
"use strict";
/* section reveals with scroll failsafe */
var secs=[].slice.call(document.querySelectorAll('.rv'));
function revealSec(s){
  if(s.classList.contains('in'))return;
  s.classList.add('in');
  setTimeout(function(){s.classList.add('done')},1600);
}
var io=new IntersectionObserver(function(es){
  es.forEach(function(e){if(e.isIntersecting)revealSec(e.target)});
},{threshold:0.15});
secs.forEach(function(s){io.observe(s)});
var allIn=false;
function revealCheck(){
  if(allIn)return;
  var pending=0;
  secs.forEach(function(s){
    if(s.classList.contains('in'))return;
    var r=s.getBoundingClientRect();
    if(r.top<innerHeight*0.85&&r.bottom>0)revealSec(s);else pending++;
  });
  if(!pending)allIn=true;
}
addEventListener('scroll',revealCheck,{passive:true});
setTimeout(revealCheck,600);

/* mobile menu (populated from nav-links BEFORE the i18n scan) */
var menuBtn=document.getElementById('menuBtn');
var mmenu=document.getElementById('mmenu');
if(menuBtn&&mmenu){
  document.querySelectorAll('.nav-links a').forEach(function(l){
    mmenu.appendChild(l.cloneNode(true));
  });
  var navCta=document.querySelector('nav .nav-cta');
  if(navCta)mmenu.appendChild(navCta.cloneNode(true));
  var closeMenu=function(){mmenu.classList.remove('open');menuBtn.setAttribute('aria-expanded','false')};
  menuBtn.addEventListener('click',function(e){
    e.stopPropagation();
    var open=mmenu.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded',open?'true':'false');
  });
  document.addEventListener('click',function(e){
    if(!mmenu.contains(e.target)&&!menuBtn.contains(e.target))closeMenu();
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMenu()});
}

/* language toggle (same storage key as the home page) */
var langBtn=document.getElementById('langBtn');
var curLang='bn';
var i18nEls=[].slice.call(document.querySelectorAll('[data-en]'));
i18nEls.forEach(function(el){el.dataset.bnHtml=el.innerHTML});
function setLang(lang){
  curLang=lang;
  document.documentElement.lang=lang==='en'?'en':'bn';
  document.body.classList.toggle('en',lang==='en');
  i18nEls.forEach(function(el){el.innerHTML=lang==='en'?el.dataset.en:el.dataset.bnHtml});
  if(langBtn)langBtn.textContent=lang==='en'?'বাং':'EN';
  try{localStorage.setItem('azm-lang',lang)}catch(e){}
}
if(langBtn)langBtn.addEventListener('click',function(){setLang(curLang==='en'?'bn':'en')});
try{if(localStorage.getItem('azm-lang')==='en')setLang('en')}catch(e){}
window.azmSetLang=setLang;
})();
