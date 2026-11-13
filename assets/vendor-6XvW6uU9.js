var ZT=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};function Jm(n){return n&&n.__esModule&&Object.prototype.hasOwnProperty.call(n,"default")?n.default:n}var ju={exports:{}},os={},Hu={exports:{}},J={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Up;function N0(){if(Up)return J;Up=1;var n=Symbol.for("react.element"),e=Symbol.for("react.portal"),r=Symbol.for("react.fragment"),s=Symbol.for("react.strict_mode"),l=Symbol.for("react.profiler"),u=Symbol.for("react.provider"),d=Symbol.for("react.context"),f=Symbol.for("react.forward_ref"),m=Symbol.for("react.suspense"),g=Symbol.for("react.memo"),y=Symbol.for("react.lazy"),w=Symbol.iterator;function k(E){return E===null||typeof E!="object"?null:(E=w&&E[w]||E["@@iterator"],typeof E=="function"?E:null)}var P={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},L=Object.assign,U={};function H(E,N,Y){this.props=E,this.context=N,this.refs=U,this.updater=Y||P}H.prototype.isReactComponent={},H.prototype.setState=function(E,N){if(typeof E!="object"&&typeof E!="function"&&E!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,E,N,"setState")},H.prototype.forceUpdate=function(E){this.updater.enqueueForceUpdate(this,E,"forceUpdate")};function pe(){}pe.prototype=H.prototype;function he(E,N,Y){this.props=E,this.context=N,this.refs=U,this.updater=Y||P}var ae=he.prototype=new pe;ae.constructor=he,L(ae,H.prototype),ae.isPureReactComponent=!0;var ne=Array.isArray,Ge=Object.prototype.hasOwnProperty,be={current:null},Ye={key:!0,ref:!0,__self:!0,__source:!0};function Xe(E,N,Y){var te,ie={},se=null,me=null;if(N!=null)for(te in N.ref!==void 0&&(me=N.ref),N.key!==void 0&&(se=""+N.key),N)Ge.call(N,te)&&!Ye.hasOwnProperty(te)&&(ie[te]=N[te]);var ce=arguments.length-2;if(ce===1)ie.children=Y;else if(1<ce){for(var Ce=Array(ce),vt=0;vt<ce;vt++)Ce[vt]=arguments[vt+2];ie.children=Ce}if(E&&E.defaultProps)for(te in ce=E.defaultProps,ce)ie[te]===void 0&&(ie[te]=ce[te]);return{$$typeof:n,type:E,key:se,ref:me,props:ie,_owner:be.current}}function Sn(E,N){return{$$typeof:n,type:E.type,key:N,ref:E.ref,props:E.props,_owner:E._owner}}function un(E){return typeof E=="object"&&E!==null&&E.$$typeof===n}function rr(E){var N={"=":"=0",":":"=2"};return"$"+E.replace(/[=:]/g,function(Y){return N[Y]})}var Xt=/\/+/g;function yt(E,N){return typeof E=="object"&&E!==null&&E.key!=null?rr(""+E.key):N.toString(36)}function Bt(E,N,Y,te,ie){var se=typeof E;(se==="undefined"||se==="boolean")&&(E=null);var me=!1;if(E===null)me=!0;else switch(se){case"string":case"number":me=!0;break;case"object":switch(E.$$typeof){case n:case e:me=!0}}if(me)return me=E,ie=ie(me),E=te===""?"."+yt(me,0):te,ne(ie)?(Y="",E!=null&&(Y=E.replace(Xt,"$&/")+"/"),Bt(ie,N,Y,"",function(vt){return vt})):ie!=null&&(un(ie)&&(ie=Sn(ie,Y+(!ie.key||me&&me.key===ie.key?"":(""+ie.key).replace(Xt,"$&/")+"/")+E)),N.push(ie)),1;if(me=0,te=te===""?".":te+":",ne(E))for(var ce=0;ce<E.length;ce++){se=E[ce];var Ce=te+yt(se,ce);me+=Bt(se,N,Y,Ce,ie)}else if(Ce=k(E),typeof Ce=="function")for(E=Ce.call(E),ce=0;!(se=E.next()).done;)se=se.value,Ce=te+yt(se,ce++),me+=Bt(se,N,Y,Ce,ie);else if(se==="object")throw N=String(E),Error("Objects are not valid as a React child (found: "+(N==="[object Object]"?"object with keys {"+Object.keys(E).join(", ")+"}":N)+"). If you meant to render a collection of children, use an array instead.");return me}function Zt(E,N,Y){if(E==null)return E;var te=[],ie=0;return Bt(E,te,"","",function(se){return N.call(Y,se,ie++)}),te}function ut(E){if(E._status===-1){var N=E._result;N=N(),N.then(function(Y){(E._status===0||E._status===-1)&&(E._status=1,E._result=Y)},function(Y){(E._status===0||E._status===-1)&&(E._status=2,E._result=Y)}),E._status===-1&&(E._status=0,E._result=N)}if(E._status===1)return E._result.default;throw E._result}var Re={current:null},b={transition:null},Q={ReactCurrentDispatcher:Re,ReactCurrentBatchConfig:b,ReactCurrentOwner:be};function z(){throw Error("act(...) is not supported in production builds of React.")}return J.Children={map:Zt,forEach:function(E,N,Y){Zt(E,function(){N.apply(this,arguments)},Y)},count:function(E){var N=0;return Zt(E,function(){N++}),N},toArray:function(E){return Zt(E,function(N){return N})||[]},only:function(E){if(!un(E))throw Error("React.Children.only expected to receive a single React element child.");return E}},J.Component=H,J.Fragment=r,J.Profiler=l,J.PureComponent=he,J.StrictMode=s,J.Suspense=m,J.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Q,J.act=z,J.cloneElement=function(E,N,Y){if(E==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+E+".");var te=L({},E.props),ie=E.key,se=E.ref,me=E._owner;if(N!=null){if(N.ref!==void 0&&(se=N.ref,me=be.current),N.key!==void 0&&(ie=""+N.key),E.type&&E.type.defaultProps)var ce=E.type.defaultProps;for(Ce in N)Ge.call(N,Ce)&&!Ye.hasOwnProperty(Ce)&&(te[Ce]=N[Ce]===void 0&&ce!==void 0?ce[Ce]:N[Ce])}var Ce=arguments.length-2;if(Ce===1)te.children=Y;else if(1<Ce){ce=Array(Ce);for(var vt=0;vt<Ce;vt++)ce[vt]=arguments[vt+2];te.children=ce}return{$$typeof:n,type:E.type,key:ie,ref:se,props:te,_owner:me}},J.createContext=function(E){return E={$$typeof:d,_currentValue:E,_currentValue2:E,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},E.Provider={$$typeof:u,_context:E},E.Consumer=E},J.createElement=Xe,J.createFactory=function(E){var N=Xe.bind(null,E);return N.type=E,N},J.createRef=function(){return{current:null}},J.forwardRef=function(E){return{$$typeof:f,render:E}},J.isValidElement=un,J.lazy=function(E){return{$$typeof:y,_payload:{_status:-1,_result:E},_init:ut}},J.memo=function(E,N){return{$$typeof:g,type:E,compare:N===void 0?null:N}},J.startTransition=function(E){var N=b.transition;b.transition={};try{E()}finally{b.transition=N}},J.unstable_act=z,J.useCallback=function(E,N){return Re.current.useCallback(E,N)},J.useContext=function(E){return Re.current.useContext(E)},J.useDebugValue=function(){},J.useDeferredValue=function(E){return Re.current.useDeferredValue(E)},J.useEffect=function(E,N){return Re.current.useEffect(E,N)},J.useId=function(){return Re.current.useId()},J.useImperativeHandle=function(E,N,Y){return Re.current.useImperativeHandle(E,N,Y)},J.useInsertionEffect=function(E,N){return Re.current.useInsertionEffect(E,N)},J.useLayoutEffect=function(E,N){return Re.current.useLayoutEffect(E,N)},J.useMemo=function(E,N){return Re.current.useMemo(E,N)},J.useReducer=function(E,N,Y){return Re.current.useReducer(E,N,Y)},J.useRef=function(E){return Re.current.useRef(E)},J.useState=function(E){return Re.current.useState(E)},J.useSyncExternalStore=function(E,N,Y){return Re.current.useSyncExternalStore(E,N,Y)},J.useTransition=function(){return Re.current.useTransition()},J.version="18.3.1",J}var Bp;function zc(){return Bp||(Bp=1,Hu.exports=N0()),Hu.exports}/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var zp;function R0(){if(zp)return os;zp=1;var n=zc(),e=Symbol.for("react.element"),r=Symbol.for("react.fragment"),s=Object.prototype.hasOwnProperty,l=n.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,u={key:!0,ref:!0,__self:!0,__source:!0};function d(f,m,g){var y,w={},k=null,P=null;g!==void 0&&(k=""+g),m.key!==void 0&&(k=""+m.key),m.ref!==void 0&&(P=m.ref);for(y in m)s.call(m,y)&&!u.hasOwnProperty(y)&&(w[y]=m[y]);if(f&&f.defaultProps)for(y in m=f.defaultProps,m)w[y]===void 0&&(w[y]=m[y]);return{$$typeof:e,type:f,key:k,ref:P,props:w,_owner:l.current}}return os.Fragment=r,os.jsx=d,os.jsxs=d,os}var jp;function P0(){return jp||(jp=1,ju.exports=R0()),ju.exports}var JT=P0(),ai=zc();const eI=Jm(ai);var Zo={},Vu={exports:{}},mt={},Wu={exports:{}},$u={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Hp;function A0(){return Hp||(Hp=1,(function(n){function e(b,Q){var z=b.length;b.push(Q);e:for(;0<z;){var E=z-1>>>1,N=b[E];if(0<l(N,Q))b[E]=Q,b[z]=N,z=E;else break e}}function r(b){return b.length===0?null:b[0]}function s(b){if(b.length===0)return null;var Q=b[0],z=b.pop();if(z!==Q){b[0]=z;e:for(var E=0,N=b.length,Y=N>>>1;E<Y;){var te=2*(E+1)-1,ie=b[te],se=te+1,me=b[se];if(0>l(ie,z))se<N&&0>l(me,ie)?(b[E]=me,b[se]=z,E=se):(b[E]=ie,b[te]=z,E=te);else if(se<N&&0>l(me,z))b[E]=me,b[se]=z,E=se;else break e}}return Q}function l(b,Q){var z=b.sortIndex-Q.sortIndex;return z!==0?z:b.id-Q.id}if(typeof performance=="object"&&typeof performance.now=="function"){var u=performance;n.unstable_now=function(){return u.now()}}else{var d=Date,f=d.now();n.unstable_now=function(){return d.now()-f}}var m=[],g=[],y=1,w=null,k=3,P=!1,L=!1,U=!1,H=typeof setTimeout=="function"?setTimeout:null,pe=typeof clearTimeout=="function"?clearTimeout:null,he=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function ae(b){for(var Q=r(g);Q!==null;){if(Q.callback===null)s(g);else if(Q.startTime<=b)s(g),Q.sortIndex=Q.expirationTime,e(m,Q);else break;Q=r(g)}}function ne(b){if(U=!1,ae(b),!L)if(r(m)!==null)L=!0,ut(Ge);else{var Q=r(g);Q!==null&&Re(ne,Q.startTime-b)}}function Ge(b,Q){L=!1,U&&(U=!1,pe(Xe),Xe=-1),P=!0;var z=k;try{for(ae(Q),w=r(m);w!==null&&(!(w.expirationTime>Q)||b&&!rr());){var E=w.callback;if(typeof E=="function"){w.callback=null,k=w.priorityLevel;var N=E(w.expirationTime<=Q);Q=n.unstable_now(),typeof N=="function"?w.callback=N:w===r(m)&&s(m),ae(Q)}else s(m);w=r(m)}if(w!==null)var Y=!0;else{var te=r(g);te!==null&&Re(ne,te.startTime-Q),Y=!1}return Y}finally{w=null,k=z,P=!1}}var be=!1,Ye=null,Xe=-1,Sn=5,un=-1;function rr(){return!(n.unstable_now()-un<Sn)}function Xt(){if(Ye!==null){var b=n.unstable_now();un=b;var Q=!0;try{Q=Ye(!0,b)}finally{Q?yt():(be=!1,Ye=null)}}else be=!1}var yt;if(typeof he=="function")yt=function(){he(Xt)};else if(typeof MessageChannel<"u"){var Bt=new MessageChannel,Zt=Bt.port2;Bt.port1.onmessage=Xt,yt=function(){Zt.postMessage(null)}}else yt=function(){H(Xt,0)};function ut(b){Ye=b,be||(be=!0,yt())}function Re(b,Q){Xe=H(function(){b(n.unstable_now())},Q)}n.unstable_IdlePriority=5,n.unstable_ImmediatePriority=1,n.unstable_LowPriority=4,n.unstable_NormalPriority=3,n.unstable_Profiling=null,n.unstable_UserBlockingPriority=2,n.unstable_cancelCallback=function(b){b.callback=null},n.unstable_continueExecution=function(){L||P||(L=!0,ut(Ge))},n.unstable_forceFrameRate=function(b){0>b||125<b?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):Sn=0<b?Math.floor(1e3/b):5},n.unstable_getCurrentPriorityLevel=function(){return k},n.unstable_getFirstCallbackNode=function(){return r(m)},n.unstable_next=function(b){switch(k){case 1:case 2:case 3:var Q=3;break;default:Q=k}var z=k;k=Q;try{return b()}finally{k=z}},n.unstable_pauseExecution=function(){},n.unstable_requestPaint=function(){},n.unstable_runWithPriority=function(b,Q){switch(b){case 1:case 2:case 3:case 4:case 5:break;default:b=3}var z=k;k=b;try{return Q()}finally{k=z}},n.unstable_scheduleCallback=function(b,Q,z){var E=n.unstable_now();switch(typeof z=="object"&&z!==null?(z=z.delay,z=typeof z=="number"&&0<z?E+z:E):z=E,b){case 1:var N=-1;break;case 2:N=250;break;case 5:N=1073741823;break;case 4:N=1e4;break;default:N=5e3}return N=z+N,b={id:y++,callback:Q,priorityLevel:b,startTime:z,expirationTime:N,sortIndex:-1},z>E?(b.sortIndex=z,e(g,b),r(m)===null&&b===r(g)&&(U?(pe(Xe),Xe=-1):U=!0,Re(ne,z-E))):(b.sortIndex=N,e(m,b),L||P||(L=!0,ut(Ge))),b},n.unstable_shouldYield=rr,n.unstable_wrapCallback=function(b){var Q=k;return function(){var z=k;k=Q;try{return b.apply(this,arguments)}finally{k=z}}}})($u)),$u}var Vp;function M0(){return Vp||(Vp=1,Wu.exports=A0()),Wu.exports}/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Wp;function D0(){if(Wp)return mt;Wp=1;var n=zc(),e=M0();function r(t){for(var i="https://reactjs.org/docs/error-decoder.html?invariant="+t,o=1;o<arguments.length;o++)i+="&args[]="+encodeURIComponent(arguments[o]);return"Minified React error #"+t+"; visit "+i+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var s=new Set,l={};function u(t,i){d(t,i),d(t+"Capture",i)}function d(t,i){for(l[t]=i,t=0;t<i.length;t++)s.add(i[t])}var f=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),m=Object.prototype.hasOwnProperty,g=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,y={},w={};function k(t){return m.call(w,t)?!0:m.call(y,t)?!1:g.test(t)?w[t]=!0:(y[t]=!0,!1)}function P(t,i,o,a){if(o!==null&&o.type===0)return!1;switch(typeof i){case"function":case"symbol":return!0;case"boolean":return a?!1:o!==null?!o.acceptsBooleans:(t=t.toLowerCase().slice(0,5),t!=="data-"&&t!=="aria-");default:return!1}}function L(t,i,o,a){if(i===null||typeof i>"u"||P(t,i,o,a))return!0;if(a)return!1;if(o!==null)switch(o.type){case 3:return!i;case 4:return i===!1;case 5:return isNaN(i);case 6:return isNaN(i)||1>i}return!1}function U(t,i,o,a,c,h,p){this.acceptsBooleans=i===2||i===3||i===4,this.attributeName=a,this.attributeNamespace=c,this.mustUseProperty=o,this.propertyName=t,this.type=i,this.sanitizeURL=h,this.removeEmptyString=p}var H={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(t){H[t]=new U(t,0,!1,t,null,!1,!1)}),[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(t){var i=t[0];H[i]=new U(i,1,!1,t[1],null,!1,!1)}),["contentEditable","draggable","spellCheck","value"].forEach(function(t){H[t]=new U(t,2,!1,t.toLowerCase(),null,!1,!1)}),["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(t){H[t]=new U(t,2,!1,t,null,!1,!1)}),"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(t){H[t]=new U(t,3,!1,t.toLowerCase(),null,!1,!1)}),["checked","multiple","muted","selected"].forEach(function(t){H[t]=new U(t,3,!0,t,null,!1,!1)}),["capture","download"].forEach(function(t){H[t]=new U(t,4,!1,t,null,!1,!1)}),["cols","rows","size","span"].forEach(function(t){H[t]=new U(t,6,!1,t,null,!1,!1)}),["rowSpan","start"].forEach(function(t){H[t]=new U(t,5,!1,t.toLowerCase(),null,!1,!1)});var pe=/[\-:]([a-z])/g;function he(t){return t[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(t){var i=t.replace(pe,he);H[i]=new U(i,1,!1,t,null,!1,!1)}),"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(t){var i=t.replace(pe,he);H[i]=new U(i,1,!1,t,"http://www.w3.org/1999/xlink",!1,!1)}),["xml:base","xml:lang","xml:space"].forEach(function(t){var i=t.replace(pe,he);H[i]=new U(i,1,!1,t,"http://www.w3.org/XML/1998/namespace",!1,!1)}),["tabIndex","crossOrigin"].forEach(function(t){H[t]=new U(t,1,!1,t.toLowerCase(),null,!1,!1)}),H.xlinkHref=new U("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1),["src","href","action","formAction"].forEach(function(t){H[t]=new U(t,1,!1,t.toLowerCase(),null,!0,!0)});function ae(t,i,o,a){var c=H.hasOwnProperty(i)?H[i]:null;(c!==null?c.type!==0:a||!(2<i.length)||i[0]!=="o"&&i[0]!=="O"||i[1]!=="n"&&i[1]!=="N")&&(L(i,o,c,a)&&(o=null),a||c===null?k(i)&&(o===null?t.removeAttribute(i):t.setAttribute(i,""+o)):c.mustUseProperty?t[c.propertyName]=o===null?c.type===3?!1:"":o:(i=c.attributeName,a=c.attributeNamespace,o===null?t.removeAttribute(i):(c=c.type,o=c===3||c===4&&o===!0?"":""+o,a?t.setAttributeNS(a,i,o):t.setAttribute(i,o))))}var ne=n.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,Ge=Symbol.for("react.element"),be=Symbol.for("react.portal"),Ye=Symbol.for("react.fragment"),Xe=Symbol.for("react.strict_mode"),Sn=Symbol.for("react.profiler"),un=Symbol.for("react.provider"),rr=Symbol.for("react.context"),Xt=Symbol.for("react.forward_ref"),yt=Symbol.for("react.suspense"),Bt=Symbol.for("react.suspense_list"),Zt=Symbol.for("react.memo"),ut=Symbol.for("react.lazy"),Re=Symbol.for("react.offscreen"),b=Symbol.iterator;function Q(t){return t===null||typeof t!="object"?null:(t=b&&t[b]||t["@@iterator"],typeof t=="function"?t:null)}var z=Object.assign,E;function N(t){if(E===void 0)try{throw Error()}catch(o){var i=o.stack.trim().match(/\n( *(at )?)/);E=i&&i[1]||""}return`
`+E+t}var Y=!1;function te(t,i){if(!t||Y)return"";Y=!0;var o=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(i)if(i=function(){throw Error()},Object.defineProperty(i.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(i,[])}catch(I){var a=I}Reflect.construct(t,[],i)}else{try{i.call()}catch(I){a=I}t.call(i.prototype)}else{try{throw Error()}catch(I){a=I}t()}}catch(I){if(I&&a&&typeof I.stack=="string"){for(var c=I.stack.split(`
`),h=a.stack.split(`
`),p=c.length-1,_=h.length-1;1<=p&&0<=_&&c[p]!==h[_];)_--;for(;1<=p&&0<=_;p--,_--)if(c[p]!==h[_]){if(p!==1||_!==1)do if(p--,_--,0>_||c[p]!==h[_]){var v=`
`+c[p].replace(" at new "," at ");return t.displayName&&v.includes("<anonymous>")&&(v=v.replace("<anonymous>",t.displayName)),v}while(1<=p&&0<=_);break}}}finally{Y=!1,Error.prepareStackTrace=o}return(t=t?t.displayName||t.name:"")?N(t):""}function ie(t){switch(t.tag){case 5:return N(t.type);case 16:return N("Lazy");case 13:return N("Suspense");case 19:return N("SuspenseList");case 0:case 2:case 15:return t=te(t.type,!1),t;case 11:return t=te(t.type.render,!1),t;case 1:return t=te(t.type,!0),t;default:return""}}function se(t){if(t==null)return null;if(typeof t=="function")return t.displayName||t.name||null;if(typeof t=="string")return t;switch(t){case Ye:return"Fragment";case be:return"Portal";case Sn:return"Profiler";case Xe:return"StrictMode";case yt:return"Suspense";case Bt:return"SuspenseList"}if(typeof t=="object")switch(t.$$typeof){case rr:return(t.displayName||"Context")+".Consumer";case un:return(t._context.displayName||"Context")+".Provider";case Xt:var i=t.render;return t=t.displayName,t||(t=i.displayName||i.name||"",t=t!==""?"ForwardRef("+t+")":"ForwardRef"),t;case Zt:return i=t.displayName||null,i!==null?i:se(t.type)||"Memo";case ut:i=t._payload,t=t._init;try{return se(t(i))}catch{}}return null}function me(t){var i=t.type;switch(t.tag){case 24:return"Cache";case 9:return(i.displayName||"Context")+".Consumer";case 10:return(i._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return t=i.render,t=t.displayName||t.name||"",i.displayName||(t!==""?"ForwardRef("+t+")":"ForwardRef");case 7:return"Fragment";case 5:return i;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return se(i);case 8:return i===Xe?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof i=="function")return i.displayName||i.name||null;if(typeof i=="string")return i}return null}function ce(t){switch(typeof t){case"boolean":case"number":case"string":case"undefined":return t;case"object":return t;default:return""}}function Ce(t){var i=t.type;return(t=t.nodeName)&&t.toLowerCase()==="input"&&(i==="checkbox"||i==="radio")}function vt(t){var i=Ce(t)?"checked":"value",o=Object.getOwnPropertyDescriptor(t.constructor.prototype,i),a=""+t[i];if(!t.hasOwnProperty(i)&&typeof o<"u"&&typeof o.get=="function"&&typeof o.set=="function"){var c=o.get,h=o.set;return Object.defineProperty(t,i,{configurable:!0,get:function(){return c.call(this)},set:function(p){a=""+p,h.call(this,p)}}),Object.defineProperty(t,i,{enumerable:o.enumerable}),{getValue:function(){return a},setValue:function(p){a=""+p},stopTracking:function(){t._valueTracker=null,delete t[i]}}}}function js(t){t._valueTracker||(t._valueTracker=vt(t))}function Vd(t){if(!t)return!1;var i=t._valueTracker;if(!i)return!0;var o=i.getValue(),a="";return t&&(a=Ce(t)?t.checked?"true":"false":t.value),t=a,t!==o?(i.setValue(t),!0):!1}function Hs(t){if(t=t||(typeof document<"u"?document:void 0),typeof t>"u")return null;try{return t.activeElement||t.body}catch{return t.body}}function Ql(t,i){var o=i.checked;return z({},i,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:o??t._wrapperState.initialChecked})}function Wd(t,i){var o=i.defaultValue==null?"":i.defaultValue,a=i.checked!=null?i.checked:i.defaultChecked;o=ce(i.value!=null?i.value:o),t._wrapperState={initialChecked:a,initialValue:o,controlled:i.type==="checkbox"||i.type==="radio"?i.checked!=null:i.value!=null}}function $d(t,i){i=i.checked,i!=null&&ae(t,"checked",i,!1)}function Gl(t,i){$d(t,i);var o=ce(i.value),a=i.type;if(o!=null)a==="number"?(o===0&&t.value===""||t.value!=o)&&(t.value=""+o):t.value!==""+o&&(t.value=""+o);else if(a==="submit"||a==="reset"){t.removeAttribute("value");return}i.hasOwnProperty("value")?Yl(t,i.type,o):i.hasOwnProperty("defaultValue")&&Yl(t,i.type,ce(i.defaultValue)),i.checked==null&&i.defaultChecked!=null&&(t.defaultChecked=!!i.defaultChecked)}function qd(t,i,o){if(i.hasOwnProperty("value")||i.hasOwnProperty("defaultValue")){var a=i.type;if(!(a!=="submit"&&a!=="reset"||i.value!==void 0&&i.value!==null))return;i=""+t._wrapperState.initialValue,o||i===t.value||(t.value=i),t.defaultValue=i}o=t.name,o!==""&&(t.name=""),t.defaultChecked=!!t._wrapperState.initialChecked,o!==""&&(t.name=o)}function Yl(t,i,o){(i!=="number"||Hs(t.ownerDocument)!==t)&&(o==null?t.defaultValue=""+t._wrapperState.initialValue:t.defaultValue!==""+o&&(t.defaultValue=""+o))}var ki=Array.isArray;function br(t,i,o,a){if(t=t.options,i){i={};for(var c=0;c<o.length;c++)i["$"+o[c]]=!0;for(o=0;o<t.length;o++)c=i.hasOwnProperty("$"+t[o].value),t[o].selected!==c&&(t[o].selected=c),c&&a&&(t[o].defaultSelected=!0)}else{for(o=""+ce(o),i=null,c=0;c<t.length;c++){if(t[c].value===o){t[c].selected=!0,a&&(t[c].defaultSelected=!0);return}i!==null||t[c].disabled||(i=t[c])}i!==null&&(i.selected=!0)}}function Xl(t,i){if(i.dangerouslySetInnerHTML!=null)throw Error(r(91));return z({},i,{value:void 0,defaultValue:void 0,children:""+t._wrapperState.initialValue})}function Kd(t,i){var o=i.value;if(o==null){if(o=i.children,i=i.defaultValue,o!=null){if(i!=null)throw Error(r(92));if(ki(o)){if(1<o.length)throw Error(r(93));o=o[0]}i=o}i==null&&(i=""),o=i}t._wrapperState={initialValue:ce(o)}}function Qd(t,i){var o=ce(i.value),a=ce(i.defaultValue);o!=null&&(o=""+o,o!==t.value&&(t.value=o),i.defaultValue==null&&t.defaultValue!==o&&(t.defaultValue=o)),a!=null&&(t.defaultValue=""+a)}function Gd(t){var i=t.textContent;i===t._wrapperState.initialValue&&i!==""&&i!==null&&(t.value=i)}function Yd(t){switch(t){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function Zl(t,i){return t==null||t==="http://www.w3.org/1999/xhtml"?Yd(i):t==="http://www.w3.org/2000/svg"&&i==="foreignObject"?"http://www.w3.org/1999/xhtml":t}var Vs,Xd=(function(t){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(i,o,a,c){MSApp.execUnsafeLocalFunction(function(){return t(i,o,a,c)})}:t})(function(t,i){if(t.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in t)t.innerHTML=i;else{for(Vs=Vs||document.createElement("div"),Vs.innerHTML="<svg>"+i.valueOf().toString()+"</svg>",i=Vs.firstChild;t.firstChild;)t.removeChild(t.firstChild);for(;i.firstChild;)t.appendChild(i.firstChild)}});function Ci(t,i){if(i){var o=t.firstChild;if(o&&o===t.lastChild&&o.nodeType===3){o.nodeValue=i;return}}t.textContent=i}var Ei={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},My=["Webkit","ms","Moz","O"];Object.keys(Ei).forEach(function(t){My.forEach(function(i){i=i+t.charAt(0).toUpperCase()+t.substring(1),Ei[i]=Ei[t]})});function Zd(t,i,o){return i==null||typeof i=="boolean"||i===""?"":o||typeof i!="number"||i===0||Ei.hasOwnProperty(t)&&Ei[t]?(""+i).trim():i+"px"}function Jd(t,i){t=t.style;for(var o in i)if(i.hasOwnProperty(o)){var a=o.indexOf("--")===0,c=Zd(o,i[o],a);o==="float"&&(o="cssFloat"),a?t.setProperty(o,c):t[o]=c}}var Dy=z({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function Jl(t,i){if(i){if(Dy[t]&&(i.children!=null||i.dangerouslySetInnerHTML!=null))throw Error(r(137,t));if(i.dangerouslySetInnerHTML!=null){if(i.children!=null)throw Error(r(60));if(typeof i.dangerouslySetInnerHTML!="object"||!("__html"in i.dangerouslySetInnerHTML))throw Error(r(61))}if(i.style!=null&&typeof i.style!="object")throw Error(r(62))}}function ea(t,i){if(t.indexOf("-")===-1)return typeof i.is=="string";switch(t){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var ta=null;function na(t){return t=t.target||t.srcElement||window,t.correspondingUseElement&&(t=t.correspondingUseElement),t.nodeType===3?t.parentNode:t}var ra=null,Fr=null,Ur=null;function eh(t){if(t=$i(t)){if(typeof ra!="function")throw Error(r(280));var i=t.stateNode;i&&(i=fo(i),ra(t.stateNode,t.type,i))}}function th(t){Fr?Ur?Ur.push(t):Ur=[t]:Fr=t}function nh(){if(Fr){var t=Fr,i=Ur;if(Ur=Fr=null,eh(t),i)for(t=0;t<i.length;t++)eh(i[t])}}function rh(t,i){return t(i)}function ih(){}var ia=!1;function sh(t,i,o){if(ia)return t(i,o);ia=!0;try{return rh(t,i,o)}finally{ia=!1,(Fr!==null||Ur!==null)&&(ih(),nh())}}function Si(t,i){var o=t.stateNode;if(o===null)return null;var a=fo(o);if(a===null)return null;o=a[i];e:switch(i){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(a=!a.disabled)||(t=t.type,a=!(t==="button"||t==="input"||t==="select"||t==="textarea")),t=!a;break e;default:t=!1}if(t)return null;if(o&&typeof o!="function")throw Error(r(231,i,typeof o));return o}var sa=!1;if(f)try{var Ti={};Object.defineProperty(Ti,"passive",{get:function(){sa=!0}}),window.addEventListener("test",Ti,Ti),window.removeEventListener("test",Ti,Ti)}catch{sa=!1}function Oy(t,i,o,a,c,h,p,_,v){var I=Array.prototype.slice.call(arguments,3);try{i.apply(o,I)}catch(R){this.onError(R)}}var Ii=!1,Ws=null,$s=!1,oa=null,Ly={onError:function(t){Ii=!0,Ws=t}};function by(t,i,o,a,c,h,p,_,v){Ii=!1,Ws=null,Oy.apply(Ly,arguments)}function Fy(t,i,o,a,c,h,p,_,v){if(by.apply(this,arguments),Ii){if(Ii){var I=Ws;Ii=!1,Ws=null}else throw Error(r(198));$s||($s=!0,oa=I)}}function ir(t){var i=t,o=t;if(t.alternate)for(;i.return;)i=i.return;else{t=i;do i=t,(i.flags&4098)!==0&&(o=i.return),t=i.return;while(t)}return i.tag===3?o:null}function oh(t){if(t.tag===13){var i=t.memoizedState;if(i===null&&(t=t.alternate,t!==null&&(i=t.memoizedState)),i!==null)return i.dehydrated}return null}function lh(t){if(ir(t)!==t)throw Error(r(188))}function Uy(t){var i=t.alternate;if(!i){if(i=ir(t),i===null)throw Error(r(188));return i!==t?null:t}for(var o=t,a=i;;){var c=o.return;if(c===null)break;var h=c.alternate;if(h===null){if(a=c.return,a!==null){o=a;continue}break}if(c.child===h.child){for(h=c.child;h;){if(h===o)return lh(c),t;if(h===a)return lh(c),i;h=h.sibling}throw Error(r(188))}if(o.return!==a.return)o=c,a=h;else{for(var p=!1,_=c.child;_;){if(_===o){p=!0,o=c,a=h;break}if(_===a){p=!0,a=c,o=h;break}_=_.sibling}if(!p){for(_=h.child;_;){if(_===o){p=!0,o=h,a=c;break}if(_===a){p=!0,a=h,o=c;break}_=_.sibling}if(!p)throw Error(r(189))}}if(o.alternate!==a)throw Error(r(190))}if(o.tag!==3)throw Error(r(188));return o.stateNode.current===o?t:i}function ah(t){return t=Uy(t),t!==null?uh(t):null}function uh(t){if(t.tag===5||t.tag===6)return t;for(t=t.child;t!==null;){var i=uh(t);if(i!==null)return i;t=t.sibling}return null}var ch=e.unstable_scheduleCallback,dh=e.unstable_cancelCallback,By=e.unstable_shouldYield,zy=e.unstable_requestPaint,De=e.unstable_now,jy=e.unstable_getCurrentPriorityLevel,la=e.unstable_ImmediatePriority,hh=e.unstable_UserBlockingPriority,qs=e.unstable_NormalPriority,Hy=e.unstable_LowPriority,fh=e.unstable_IdlePriority,Ks=null,Jt=null;function Vy(t){if(Jt&&typeof Jt.onCommitFiberRoot=="function")try{Jt.onCommitFiberRoot(Ks,t,void 0,(t.current.flags&128)===128)}catch{}}var zt=Math.clz32?Math.clz32:qy,Wy=Math.log,$y=Math.LN2;function qy(t){return t>>>=0,t===0?32:31-(Wy(t)/$y|0)|0}var Qs=64,Gs=4194304;function xi(t){switch(t&-t){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return t&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return t}}function Ys(t,i){var o=t.pendingLanes;if(o===0)return 0;var a=0,c=t.suspendedLanes,h=t.pingedLanes,p=o&268435455;if(p!==0){var _=p&~c;_!==0?a=xi(_):(h&=p,h!==0&&(a=xi(h)))}else p=o&~c,p!==0?a=xi(p):h!==0&&(a=xi(h));if(a===0)return 0;if(i!==0&&i!==a&&(i&c)===0&&(c=a&-a,h=i&-i,c>=h||c===16&&(h&4194240)!==0))return i;if((a&4)!==0&&(a|=o&16),i=t.entangledLanes,i!==0)for(t=t.entanglements,i&=a;0<i;)o=31-zt(i),c=1<<o,a|=t[o],i&=~c;return a}function Ky(t,i){switch(t){case 1:case 2:case 4:return i+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return i+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function Qy(t,i){for(var o=t.suspendedLanes,a=t.pingedLanes,c=t.expirationTimes,h=t.pendingLanes;0<h;){var p=31-zt(h),_=1<<p,v=c[p];v===-1?((_&o)===0||(_&a)!==0)&&(c[p]=Ky(_,i)):v<=i&&(t.expiredLanes|=_),h&=~_}}function aa(t){return t=t.pendingLanes&-1073741825,t!==0?t:t&1073741824?1073741824:0}function ph(){var t=Qs;return Qs<<=1,(Qs&4194240)===0&&(Qs=64),t}function ua(t){for(var i=[],o=0;31>o;o++)i.push(t);return i}function Ni(t,i,o){t.pendingLanes|=i,i!==536870912&&(t.suspendedLanes=0,t.pingedLanes=0),t=t.eventTimes,i=31-zt(i),t[i]=o}function Gy(t,i){var o=t.pendingLanes&~i;t.pendingLanes=i,t.suspendedLanes=0,t.pingedLanes=0,t.expiredLanes&=i,t.mutableReadLanes&=i,t.entangledLanes&=i,i=t.entanglements;var a=t.eventTimes;for(t=t.expirationTimes;0<o;){var c=31-zt(o),h=1<<c;i[c]=0,a[c]=-1,t[c]=-1,o&=~h}}function ca(t,i){var o=t.entangledLanes|=i;for(t=t.entanglements;o;){var a=31-zt(o),c=1<<a;c&i|t[a]&i&&(t[a]|=i),o&=~c}}var de=0;function mh(t){return t&=-t,1<t?4<t?(t&268435455)!==0?16:536870912:4:1}var gh,da,_h,yh,vh,ha=!1,Xs=[],Tn=null,In=null,xn=null,Ri=new Map,Pi=new Map,Nn=[],Yy="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function wh(t,i){switch(t){case"focusin":case"focusout":Tn=null;break;case"dragenter":case"dragleave":In=null;break;case"mouseover":case"mouseout":xn=null;break;case"pointerover":case"pointerout":Ri.delete(i.pointerId);break;case"gotpointercapture":case"lostpointercapture":Pi.delete(i.pointerId)}}function Ai(t,i,o,a,c,h){return t===null||t.nativeEvent!==h?(t={blockedOn:i,domEventName:o,eventSystemFlags:a,nativeEvent:h,targetContainers:[c]},i!==null&&(i=$i(i),i!==null&&da(i)),t):(t.eventSystemFlags|=a,i=t.targetContainers,c!==null&&i.indexOf(c)===-1&&i.push(c),t)}function Xy(t,i,o,a,c){switch(i){case"focusin":return Tn=Ai(Tn,t,i,o,a,c),!0;case"dragenter":return In=Ai(In,t,i,o,a,c),!0;case"mouseover":return xn=Ai(xn,t,i,o,a,c),!0;case"pointerover":var h=c.pointerId;return Ri.set(h,Ai(Ri.get(h)||null,t,i,o,a,c)),!0;case"gotpointercapture":return h=c.pointerId,Pi.set(h,Ai(Pi.get(h)||null,t,i,o,a,c)),!0}return!1}function kh(t){var i=sr(t.target);if(i!==null){var o=ir(i);if(o!==null){if(i=o.tag,i===13){if(i=oh(o),i!==null){t.blockedOn=i,vh(t.priority,function(){_h(o)});return}}else if(i===3&&o.stateNode.current.memoizedState.isDehydrated){t.blockedOn=o.tag===3?o.stateNode.containerInfo:null;return}}}t.blockedOn=null}function Zs(t){if(t.blockedOn!==null)return!1;for(var i=t.targetContainers;0<i.length;){var o=pa(t.domEventName,t.eventSystemFlags,i[0],t.nativeEvent);if(o===null){o=t.nativeEvent;var a=new o.constructor(o.type,o);ta=a,o.target.dispatchEvent(a),ta=null}else return i=$i(o),i!==null&&da(i),t.blockedOn=o,!1;i.shift()}return!0}function Ch(t,i,o){Zs(t)&&o.delete(i)}function Zy(){ha=!1,Tn!==null&&Zs(Tn)&&(Tn=null),In!==null&&Zs(In)&&(In=null),xn!==null&&Zs(xn)&&(xn=null),Ri.forEach(Ch),Pi.forEach(Ch)}function Mi(t,i){t.blockedOn===i&&(t.blockedOn=null,ha||(ha=!0,e.unstable_scheduleCallback(e.unstable_NormalPriority,Zy)))}function Di(t){function i(c){return Mi(c,t)}if(0<Xs.length){Mi(Xs[0],t);for(var o=1;o<Xs.length;o++){var a=Xs[o];a.blockedOn===t&&(a.blockedOn=null)}}for(Tn!==null&&Mi(Tn,t),In!==null&&Mi(In,t),xn!==null&&Mi(xn,t),Ri.forEach(i),Pi.forEach(i),o=0;o<Nn.length;o++)a=Nn[o],a.blockedOn===t&&(a.blockedOn=null);for(;0<Nn.length&&(o=Nn[0],o.blockedOn===null);)kh(o),o.blockedOn===null&&Nn.shift()}var Br=ne.ReactCurrentBatchConfig,Js=!0;function Jy(t,i,o,a){var c=de,h=Br.transition;Br.transition=null;try{de=1,fa(t,i,o,a)}finally{de=c,Br.transition=h}}function e1(t,i,o,a){var c=de,h=Br.transition;Br.transition=null;try{de=4,fa(t,i,o,a)}finally{de=c,Br.transition=h}}function fa(t,i,o,a){if(Js){var c=pa(t,i,o,a);if(c===null)Aa(t,i,a,eo,o),wh(t,a);else if(Xy(c,t,i,o,a))a.stopPropagation();else if(wh(t,a),i&4&&-1<Yy.indexOf(t)){for(;c!==null;){var h=$i(c);if(h!==null&&gh(h),h=pa(t,i,o,a),h===null&&Aa(t,i,a,eo,o),h===c)break;c=h}c!==null&&a.stopPropagation()}else Aa(t,i,a,null,o)}}var eo=null;function pa(t,i,o,a){if(eo=null,t=na(a),t=sr(t),t!==null)if(i=ir(t),i===null)t=null;else if(o=i.tag,o===13){if(t=oh(i),t!==null)return t;t=null}else if(o===3){if(i.stateNode.current.memoizedState.isDehydrated)return i.tag===3?i.stateNode.containerInfo:null;t=null}else i!==t&&(t=null);return eo=t,null}function Eh(t){switch(t){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(jy()){case la:return 1;case hh:return 4;case qs:case Hy:return 16;case fh:return 536870912;default:return 16}default:return 16}}var Rn=null,ma=null,to=null;function Sh(){if(to)return to;var t,i=ma,o=i.length,a,c="value"in Rn?Rn.value:Rn.textContent,h=c.length;for(t=0;t<o&&i[t]===c[t];t++);var p=o-t;for(a=1;a<=p&&i[o-a]===c[h-a];a++);return to=c.slice(t,1<a?1-a:void 0)}function no(t){var i=t.keyCode;return"charCode"in t?(t=t.charCode,t===0&&i===13&&(t=13)):t=i,t===10&&(t=13),32<=t||t===13?t:0}function ro(){return!0}function Th(){return!1}function wt(t){function i(o,a,c,h,p){this._reactName=o,this._targetInst=c,this.type=a,this.nativeEvent=h,this.target=p,this.currentTarget=null;for(var _ in t)t.hasOwnProperty(_)&&(o=t[_],this[_]=o?o(h):h[_]);return this.isDefaultPrevented=(h.defaultPrevented!=null?h.defaultPrevented:h.returnValue===!1)?ro:Th,this.isPropagationStopped=Th,this}return z(i.prototype,{preventDefault:function(){this.defaultPrevented=!0;var o=this.nativeEvent;o&&(o.preventDefault?o.preventDefault():typeof o.returnValue!="unknown"&&(o.returnValue=!1),this.isDefaultPrevented=ro)},stopPropagation:function(){var o=this.nativeEvent;o&&(o.stopPropagation?o.stopPropagation():typeof o.cancelBubble!="unknown"&&(o.cancelBubble=!0),this.isPropagationStopped=ro)},persist:function(){},isPersistent:ro}),i}var zr={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(t){return t.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},ga=wt(zr),Oi=z({},zr,{view:0,detail:0}),t1=wt(Oi),_a,ya,Li,io=z({},Oi,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:wa,button:0,buttons:0,relatedTarget:function(t){return t.relatedTarget===void 0?t.fromElement===t.srcElement?t.toElement:t.fromElement:t.relatedTarget},movementX:function(t){return"movementX"in t?t.movementX:(t!==Li&&(Li&&t.type==="mousemove"?(_a=t.screenX-Li.screenX,ya=t.screenY-Li.screenY):ya=_a=0,Li=t),_a)},movementY:function(t){return"movementY"in t?t.movementY:ya}}),Ih=wt(io),n1=z({},io,{dataTransfer:0}),r1=wt(n1),i1=z({},Oi,{relatedTarget:0}),va=wt(i1),s1=z({},zr,{animationName:0,elapsedTime:0,pseudoElement:0}),o1=wt(s1),l1=z({},zr,{clipboardData:function(t){return"clipboardData"in t?t.clipboardData:window.clipboardData}}),a1=wt(l1),u1=z({},zr,{data:0}),xh=wt(u1),c1={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},d1={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},h1={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function f1(t){var i=this.nativeEvent;return i.getModifierState?i.getModifierState(t):(t=h1[t])?!!i[t]:!1}function wa(){return f1}var p1=z({},Oi,{key:function(t){if(t.key){var i=c1[t.key]||t.key;if(i!=="Unidentified")return i}return t.type==="keypress"?(t=no(t),t===13?"Enter":String.fromCharCode(t)):t.type==="keydown"||t.type==="keyup"?d1[t.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:wa,charCode:function(t){return t.type==="keypress"?no(t):0},keyCode:function(t){return t.type==="keydown"||t.type==="keyup"?t.keyCode:0},which:function(t){return t.type==="keypress"?no(t):t.type==="keydown"||t.type==="keyup"?t.keyCode:0}}),m1=wt(p1),g1=z({},io,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),Nh=wt(g1),_1=z({},Oi,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:wa}),y1=wt(_1),v1=z({},zr,{propertyName:0,elapsedTime:0,pseudoElement:0}),w1=wt(v1),k1=z({},io,{deltaX:function(t){return"deltaX"in t?t.deltaX:"wheelDeltaX"in t?-t.wheelDeltaX:0},deltaY:function(t){return"deltaY"in t?t.deltaY:"wheelDeltaY"in t?-t.wheelDeltaY:"wheelDelta"in t?-t.wheelDelta:0},deltaZ:0,deltaMode:0}),C1=wt(k1),E1=[9,13,27,32],ka=f&&"CompositionEvent"in window,bi=null;f&&"documentMode"in document&&(bi=document.documentMode);var S1=f&&"TextEvent"in window&&!bi,Rh=f&&(!ka||bi&&8<bi&&11>=bi),Ph=" ",Ah=!1;function Mh(t,i){switch(t){case"keyup":return E1.indexOf(i.keyCode)!==-1;case"keydown":return i.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function Dh(t){return t=t.detail,typeof t=="object"&&"data"in t?t.data:null}var jr=!1;function T1(t,i){switch(t){case"compositionend":return Dh(i);case"keypress":return i.which!==32?null:(Ah=!0,Ph);case"textInput":return t=i.data,t===Ph&&Ah?null:t;default:return null}}function I1(t,i){if(jr)return t==="compositionend"||!ka&&Mh(t,i)?(t=Sh(),to=ma=Rn=null,jr=!1,t):null;switch(t){case"paste":return null;case"keypress":if(!(i.ctrlKey||i.altKey||i.metaKey)||i.ctrlKey&&i.altKey){if(i.char&&1<i.char.length)return i.char;if(i.which)return String.fromCharCode(i.which)}return null;case"compositionend":return Rh&&i.locale!=="ko"?null:i.data;default:return null}}var x1={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function Oh(t){var i=t&&t.nodeName&&t.nodeName.toLowerCase();return i==="input"?!!x1[t.type]:i==="textarea"}function Lh(t,i,o,a){th(a),i=uo(i,"onChange"),0<i.length&&(o=new ga("onChange","change",null,o,a),t.push({event:o,listeners:i}))}var Fi=null,Ui=null;function N1(t){Jh(t,0)}function so(t){var i=qr(t);if(Vd(i))return t}function R1(t,i){if(t==="change")return i}var bh=!1;if(f){var Ca;if(f){var Ea="oninput"in document;if(!Ea){var Fh=document.createElement("div");Fh.setAttribute("oninput","return;"),Ea=typeof Fh.oninput=="function"}Ca=Ea}else Ca=!1;bh=Ca&&(!document.documentMode||9<document.documentMode)}function Uh(){Fi&&(Fi.detachEvent("onpropertychange",Bh),Ui=Fi=null)}function Bh(t){if(t.propertyName==="value"&&so(Ui)){var i=[];Lh(i,Ui,t,na(t)),sh(N1,i)}}function P1(t,i,o){t==="focusin"?(Uh(),Fi=i,Ui=o,Fi.attachEvent("onpropertychange",Bh)):t==="focusout"&&Uh()}function A1(t){if(t==="selectionchange"||t==="keyup"||t==="keydown")return so(Ui)}function M1(t,i){if(t==="click")return so(i)}function D1(t,i){if(t==="input"||t==="change")return so(i)}function O1(t,i){return t===i&&(t!==0||1/t===1/i)||t!==t&&i!==i}var jt=typeof Object.is=="function"?Object.is:O1;function Bi(t,i){if(jt(t,i))return!0;if(typeof t!="object"||t===null||typeof i!="object"||i===null)return!1;var o=Object.keys(t),a=Object.keys(i);if(o.length!==a.length)return!1;for(a=0;a<o.length;a++){var c=o[a];if(!m.call(i,c)||!jt(t[c],i[c]))return!1}return!0}function zh(t){for(;t&&t.firstChild;)t=t.firstChild;return t}function jh(t,i){var o=zh(t);t=0;for(var a;o;){if(o.nodeType===3){if(a=t+o.textContent.length,t<=i&&a>=i)return{node:o,offset:i-t};t=a}e:{for(;o;){if(o.nextSibling){o=o.nextSibling;break e}o=o.parentNode}o=void 0}o=zh(o)}}function Hh(t,i){return t&&i?t===i?!0:t&&t.nodeType===3?!1:i&&i.nodeType===3?Hh(t,i.parentNode):"contains"in t?t.contains(i):t.compareDocumentPosition?!!(t.compareDocumentPosition(i)&16):!1:!1}function Vh(){for(var t=window,i=Hs();i instanceof t.HTMLIFrameElement;){try{var o=typeof i.contentWindow.location.href=="string"}catch{o=!1}if(o)t=i.contentWindow;else break;i=Hs(t.document)}return i}function Sa(t){var i=t&&t.nodeName&&t.nodeName.toLowerCase();return i&&(i==="input"&&(t.type==="text"||t.type==="search"||t.type==="tel"||t.type==="url"||t.type==="password")||i==="textarea"||t.contentEditable==="true")}function L1(t){var i=Vh(),o=t.focusedElem,a=t.selectionRange;if(i!==o&&o&&o.ownerDocument&&Hh(o.ownerDocument.documentElement,o)){if(a!==null&&Sa(o)){if(i=a.start,t=a.end,t===void 0&&(t=i),"selectionStart"in o)o.selectionStart=i,o.selectionEnd=Math.min(t,o.value.length);else if(t=(i=o.ownerDocument||document)&&i.defaultView||window,t.getSelection){t=t.getSelection();var c=o.textContent.length,h=Math.min(a.start,c);a=a.end===void 0?h:Math.min(a.end,c),!t.extend&&h>a&&(c=a,a=h,h=c),c=jh(o,h);var p=jh(o,a);c&&p&&(t.rangeCount!==1||t.anchorNode!==c.node||t.anchorOffset!==c.offset||t.focusNode!==p.node||t.focusOffset!==p.offset)&&(i=i.createRange(),i.setStart(c.node,c.offset),t.removeAllRanges(),h>a?(t.addRange(i),t.extend(p.node,p.offset)):(i.setEnd(p.node,p.offset),t.addRange(i)))}}for(i=[],t=o;t=t.parentNode;)t.nodeType===1&&i.push({element:t,left:t.scrollLeft,top:t.scrollTop});for(typeof o.focus=="function"&&o.focus(),o=0;o<i.length;o++)t=i[o],t.element.scrollLeft=t.left,t.element.scrollTop=t.top}}var b1=f&&"documentMode"in document&&11>=document.documentMode,Hr=null,Ta=null,zi=null,Ia=!1;function Wh(t,i,o){var a=o.window===o?o.document:o.nodeType===9?o:o.ownerDocument;Ia||Hr==null||Hr!==Hs(a)||(a=Hr,"selectionStart"in a&&Sa(a)?a={start:a.selectionStart,end:a.selectionEnd}:(a=(a.ownerDocument&&a.ownerDocument.defaultView||window).getSelection(),a={anchorNode:a.anchorNode,anchorOffset:a.anchorOffset,focusNode:a.focusNode,focusOffset:a.focusOffset}),zi&&Bi(zi,a)||(zi=a,a=uo(Ta,"onSelect"),0<a.length&&(i=new ga("onSelect","select",null,i,o),t.push({event:i,listeners:a}),i.target=Hr)))}function oo(t,i){var o={};return o[t.toLowerCase()]=i.toLowerCase(),o["Webkit"+t]="webkit"+i,o["Moz"+t]="moz"+i,o}var Vr={animationend:oo("Animation","AnimationEnd"),animationiteration:oo("Animation","AnimationIteration"),animationstart:oo("Animation","AnimationStart"),transitionend:oo("Transition","TransitionEnd")},xa={},$h={};f&&($h=document.createElement("div").style,"AnimationEvent"in window||(delete Vr.animationend.animation,delete Vr.animationiteration.animation,delete Vr.animationstart.animation),"TransitionEvent"in window||delete Vr.transitionend.transition);function lo(t){if(xa[t])return xa[t];if(!Vr[t])return t;var i=Vr[t],o;for(o in i)if(i.hasOwnProperty(o)&&o in $h)return xa[t]=i[o];return t}var qh=lo("animationend"),Kh=lo("animationiteration"),Qh=lo("animationstart"),Gh=lo("transitionend"),Yh=new Map,Xh="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function Pn(t,i){Yh.set(t,i),u(i,[t])}for(var Na=0;Na<Xh.length;Na++){var Ra=Xh[Na],F1=Ra.toLowerCase(),U1=Ra[0].toUpperCase()+Ra.slice(1);Pn(F1,"on"+U1)}Pn(qh,"onAnimationEnd"),Pn(Kh,"onAnimationIteration"),Pn(Qh,"onAnimationStart"),Pn("dblclick","onDoubleClick"),Pn("focusin","onFocus"),Pn("focusout","onBlur"),Pn(Gh,"onTransitionEnd"),d("onMouseEnter",["mouseout","mouseover"]),d("onMouseLeave",["mouseout","mouseover"]),d("onPointerEnter",["pointerout","pointerover"]),d("onPointerLeave",["pointerout","pointerover"]),u("onChange","change click focusin focusout input keydown keyup selectionchange".split(" ")),u("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")),u("onBeforeInput",["compositionend","keypress","textInput","paste"]),u("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" ")),u("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" ")),u("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var ji="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),B1=new Set("cancel close invalid load scroll toggle".split(" ").concat(ji));function Zh(t,i,o){var a=t.type||"unknown-event";t.currentTarget=o,Fy(a,i,void 0,t),t.currentTarget=null}function Jh(t,i){i=(i&4)!==0;for(var o=0;o<t.length;o++){var a=t[o],c=a.event;a=a.listeners;e:{var h=void 0;if(i)for(var p=a.length-1;0<=p;p--){var _=a[p],v=_.instance,I=_.currentTarget;if(_=_.listener,v!==h&&c.isPropagationStopped())break e;Zh(c,_,I),h=v}else for(p=0;p<a.length;p++){if(_=a[p],v=_.instance,I=_.currentTarget,_=_.listener,v!==h&&c.isPropagationStopped())break e;Zh(c,_,I),h=v}}}if($s)throw t=oa,$s=!1,oa=null,t}function we(t,i){var o=i[Fa];o===void 0&&(o=i[Fa]=new Set);var a=t+"__bubble";o.has(a)||(ef(i,t,2,!1),o.add(a))}function Pa(t,i,o){var a=0;i&&(a|=4),ef(o,t,a,i)}var ao="_reactListening"+Math.random().toString(36).slice(2);function Hi(t){if(!t[ao]){t[ao]=!0,s.forEach(function(o){o!=="selectionchange"&&(B1.has(o)||Pa(o,!1,t),Pa(o,!0,t))});var i=t.nodeType===9?t:t.ownerDocument;i===null||i[ao]||(i[ao]=!0,Pa("selectionchange",!1,i))}}function ef(t,i,o,a){switch(Eh(i)){case 1:var c=Jy;break;case 4:c=e1;break;default:c=fa}o=c.bind(null,i,o,t),c=void 0,!sa||i!=="touchstart"&&i!=="touchmove"&&i!=="wheel"||(c=!0),a?c!==void 0?t.addEventListener(i,o,{capture:!0,passive:c}):t.addEventListener(i,o,!0):c!==void 0?t.addEventListener(i,o,{passive:c}):t.addEventListener(i,o,!1)}function Aa(t,i,o,a,c){var h=a;if((i&1)===0&&(i&2)===0&&a!==null)e:for(;;){if(a===null)return;var p=a.tag;if(p===3||p===4){var _=a.stateNode.containerInfo;if(_===c||_.nodeType===8&&_.parentNode===c)break;if(p===4)for(p=a.return;p!==null;){var v=p.tag;if((v===3||v===4)&&(v=p.stateNode.containerInfo,v===c||v.nodeType===8&&v.parentNode===c))return;p=p.return}for(;_!==null;){if(p=sr(_),p===null)return;if(v=p.tag,v===5||v===6){a=h=p;continue e}_=_.parentNode}}a=a.return}sh(function(){var I=h,R=na(o),M=[];e:{var x=Yh.get(t);if(x!==void 0){var F=ga,j=t;switch(t){case"keypress":if(no(o)===0)break e;case"keydown":case"keyup":F=m1;break;case"focusin":j="focus",F=va;break;case"focusout":j="blur",F=va;break;case"beforeblur":case"afterblur":F=va;break;case"click":if(o.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":F=Ih;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":F=r1;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":F=y1;break;case qh:case Kh:case Qh:F=o1;break;case Gh:F=w1;break;case"scroll":F=t1;break;case"wheel":F=C1;break;case"copy":case"cut":case"paste":F=a1;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":F=Nh}var V=(i&4)!==0,Oe=!V&&t==="scroll",S=V?x!==null?x+"Capture":null:x;V=[];for(var C=I,T;C!==null;){T=C;var O=T.stateNode;if(T.tag===5&&O!==null&&(T=O,S!==null&&(O=Si(C,S),O!=null&&V.push(Vi(C,O,T)))),Oe)break;C=C.return}0<V.length&&(x=new F(x,j,null,o,R),M.push({event:x,listeners:V}))}}if((i&7)===0){e:{if(x=t==="mouseover"||t==="pointerover",F=t==="mouseout"||t==="pointerout",x&&o!==ta&&(j=o.relatedTarget||o.fromElement)&&(sr(j)||j[cn]))break e;if((F||x)&&(x=R.window===R?R:(x=R.ownerDocument)?x.defaultView||x.parentWindow:window,F?(j=o.relatedTarget||o.toElement,F=I,j=j?sr(j):null,j!==null&&(Oe=ir(j),j!==Oe||j.tag!==5&&j.tag!==6)&&(j=null)):(F=null,j=I),F!==j)){if(V=Ih,O="onMouseLeave",S="onMouseEnter",C="mouse",(t==="pointerout"||t==="pointerover")&&(V=Nh,O="onPointerLeave",S="onPointerEnter",C="pointer"),Oe=F==null?x:qr(F),T=j==null?x:qr(j),x=new V(O,C+"leave",F,o,R),x.target=Oe,x.relatedTarget=T,O=null,sr(R)===I&&(V=new V(S,C+"enter",j,o,R),V.target=T,V.relatedTarget=Oe,O=V),Oe=O,F&&j)t:{for(V=F,S=j,C=0,T=V;T;T=Wr(T))C++;for(T=0,O=S;O;O=Wr(O))T++;for(;0<C-T;)V=Wr(V),C--;for(;0<T-C;)S=Wr(S),T--;for(;C--;){if(V===S||S!==null&&V===S.alternate)break t;V=Wr(V),S=Wr(S)}V=null}else V=null;F!==null&&tf(M,x,F,V,!1),j!==null&&Oe!==null&&tf(M,Oe,j,V,!0)}}e:{if(x=I?qr(I):window,F=x.nodeName&&x.nodeName.toLowerCase(),F==="select"||F==="input"&&x.type==="file")var W=R1;else if(Oh(x))if(bh)W=D1;else{W=A1;var $=P1}else(F=x.nodeName)&&F.toLowerCase()==="input"&&(x.type==="checkbox"||x.type==="radio")&&(W=M1);if(W&&(W=W(t,I))){Lh(M,W,o,R);break e}$&&$(t,x,I),t==="focusout"&&($=x._wrapperState)&&$.controlled&&x.type==="number"&&Yl(x,"number",x.value)}switch($=I?qr(I):window,t){case"focusin":(Oh($)||$.contentEditable==="true")&&(Hr=$,Ta=I,zi=null);break;case"focusout":zi=Ta=Hr=null;break;case"mousedown":Ia=!0;break;case"contextmenu":case"mouseup":case"dragend":Ia=!1,Wh(M,o,R);break;case"selectionchange":if(b1)break;case"keydown":case"keyup":Wh(M,o,R)}var q;if(ka)e:{switch(t){case"compositionstart":var G="onCompositionStart";break e;case"compositionend":G="onCompositionEnd";break e;case"compositionupdate":G="onCompositionUpdate";break e}G=void 0}else jr?Mh(t,o)&&(G="onCompositionEnd"):t==="keydown"&&o.keyCode===229&&(G="onCompositionStart");G&&(Rh&&o.locale!=="ko"&&(jr||G!=="onCompositionStart"?G==="onCompositionEnd"&&jr&&(q=Sh()):(Rn=R,ma="value"in Rn?Rn.value:Rn.textContent,jr=!0)),$=uo(I,G),0<$.length&&(G=new xh(G,t,null,o,R),M.push({event:G,listeners:$}),q?G.data=q:(q=Dh(o),q!==null&&(G.data=q)))),(q=S1?T1(t,o):I1(t,o))&&(I=uo(I,"onBeforeInput"),0<I.length&&(R=new xh("onBeforeInput","beforeinput",null,o,R),M.push({event:R,listeners:I}),R.data=q))}Jh(M,i)})}function Vi(t,i,o){return{instance:t,listener:i,currentTarget:o}}function uo(t,i){for(var o=i+"Capture",a=[];t!==null;){var c=t,h=c.stateNode;c.tag===5&&h!==null&&(c=h,h=Si(t,o),h!=null&&a.unshift(Vi(t,h,c)),h=Si(t,i),h!=null&&a.push(Vi(t,h,c))),t=t.return}return a}function Wr(t){if(t===null)return null;do t=t.return;while(t&&t.tag!==5);return t||null}function tf(t,i,o,a,c){for(var h=i._reactName,p=[];o!==null&&o!==a;){var _=o,v=_.alternate,I=_.stateNode;if(v!==null&&v===a)break;_.tag===5&&I!==null&&(_=I,c?(v=Si(o,h),v!=null&&p.unshift(Vi(o,v,_))):c||(v=Si(o,h),v!=null&&p.push(Vi(o,v,_)))),o=o.return}p.length!==0&&t.push({event:i,listeners:p})}var z1=/\r\n?/g,j1=/\u0000|\uFFFD/g;function nf(t){return(typeof t=="string"?t:""+t).replace(z1,`
`).replace(j1,"")}function co(t,i,o){if(i=nf(i),nf(t)!==i&&o)throw Error(r(425))}function ho(){}var Ma=null,Da=null;function Oa(t,i){return t==="textarea"||t==="noscript"||typeof i.children=="string"||typeof i.children=="number"||typeof i.dangerouslySetInnerHTML=="object"&&i.dangerouslySetInnerHTML!==null&&i.dangerouslySetInnerHTML.__html!=null}var La=typeof setTimeout=="function"?setTimeout:void 0,H1=typeof clearTimeout=="function"?clearTimeout:void 0,rf=typeof Promise=="function"?Promise:void 0,V1=typeof queueMicrotask=="function"?queueMicrotask:typeof rf<"u"?function(t){return rf.resolve(null).then(t).catch(W1)}:La;function W1(t){setTimeout(function(){throw t})}function ba(t,i){var o=i,a=0;do{var c=o.nextSibling;if(t.removeChild(o),c&&c.nodeType===8)if(o=c.data,o==="/$"){if(a===0){t.removeChild(c),Di(i);return}a--}else o!=="$"&&o!=="$?"&&o!=="$!"||a++;o=c}while(o);Di(i)}function An(t){for(;t!=null;t=t.nextSibling){var i=t.nodeType;if(i===1||i===3)break;if(i===8){if(i=t.data,i==="$"||i==="$!"||i==="$?")break;if(i==="/$")return null}}return t}function sf(t){t=t.previousSibling;for(var i=0;t;){if(t.nodeType===8){var o=t.data;if(o==="$"||o==="$!"||o==="$?"){if(i===0)return t;i--}else o==="/$"&&i++}t=t.previousSibling}return null}var $r=Math.random().toString(36).slice(2),en="__reactFiber$"+$r,Wi="__reactProps$"+$r,cn="__reactContainer$"+$r,Fa="__reactEvents$"+$r,$1="__reactListeners$"+$r,q1="__reactHandles$"+$r;function sr(t){var i=t[en];if(i)return i;for(var o=t.parentNode;o;){if(i=o[cn]||o[en]){if(o=i.alternate,i.child!==null||o!==null&&o.child!==null)for(t=sf(t);t!==null;){if(o=t[en])return o;t=sf(t)}return i}t=o,o=t.parentNode}return null}function $i(t){return t=t[en]||t[cn],!t||t.tag!==5&&t.tag!==6&&t.tag!==13&&t.tag!==3?null:t}function qr(t){if(t.tag===5||t.tag===6)return t.stateNode;throw Error(r(33))}function fo(t){return t[Wi]||null}var Ua=[],Kr=-1;function Mn(t){return{current:t}}function ke(t){0>Kr||(t.current=Ua[Kr],Ua[Kr]=null,Kr--)}function ge(t,i){Kr++,Ua[Kr]=t.current,t.current=i}var Dn={},Ze=Mn(Dn),ct=Mn(!1),or=Dn;function Qr(t,i){var o=t.type.contextTypes;if(!o)return Dn;var a=t.stateNode;if(a&&a.__reactInternalMemoizedUnmaskedChildContext===i)return a.__reactInternalMemoizedMaskedChildContext;var c={},h;for(h in o)c[h]=i[h];return a&&(t=t.stateNode,t.__reactInternalMemoizedUnmaskedChildContext=i,t.__reactInternalMemoizedMaskedChildContext=c),c}function dt(t){return t=t.childContextTypes,t!=null}function po(){ke(ct),ke(Ze)}function of(t,i,o){if(Ze.current!==Dn)throw Error(r(168));ge(Ze,i),ge(ct,o)}function lf(t,i,o){var a=t.stateNode;if(i=i.childContextTypes,typeof a.getChildContext!="function")return o;a=a.getChildContext();for(var c in a)if(!(c in i))throw Error(r(108,me(t)||"Unknown",c));return z({},o,a)}function mo(t){return t=(t=t.stateNode)&&t.__reactInternalMemoizedMergedChildContext||Dn,or=Ze.current,ge(Ze,t),ge(ct,ct.current),!0}function af(t,i,o){var a=t.stateNode;if(!a)throw Error(r(169));o?(t=lf(t,i,or),a.__reactInternalMemoizedMergedChildContext=t,ke(ct),ke(Ze),ge(Ze,t)):ke(ct),ge(ct,o)}var dn=null,go=!1,Ba=!1;function uf(t){dn===null?dn=[t]:dn.push(t)}function K1(t){go=!0,uf(t)}function On(){if(!Ba&&dn!==null){Ba=!0;var t=0,i=de;try{var o=dn;for(de=1;t<o.length;t++){var a=o[t];do a=a(!0);while(a!==null)}dn=null,go=!1}catch(c){throw dn!==null&&(dn=dn.slice(t+1)),ch(la,On),c}finally{de=i,Ba=!1}}return null}var Gr=[],Yr=0,_o=null,yo=0,It=[],xt=0,lr=null,hn=1,fn="";function ar(t,i){Gr[Yr++]=yo,Gr[Yr++]=_o,_o=t,yo=i}function cf(t,i,o){It[xt++]=hn,It[xt++]=fn,It[xt++]=lr,lr=t;var a=hn;t=fn;var c=32-zt(a)-1;a&=~(1<<c),o+=1;var h=32-zt(i)+c;if(30<h){var p=c-c%5;h=(a&(1<<p)-1).toString(32),a>>=p,c-=p,hn=1<<32-zt(i)+c|o<<c|a,fn=h+t}else hn=1<<h|o<<c|a,fn=t}function za(t){t.return!==null&&(ar(t,1),cf(t,1,0))}function ja(t){for(;t===_o;)_o=Gr[--Yr],Gr[Yr]=null,yo=Gr[--Yr],Gr[Yr]=null;for(;t===lr;)lr=It[--xt],It[xt]=null,fn=It[--xt],It[xt]=null,hn=It[--xt],It[xt]=null}var kt=null,Ct=null,Ee=!1,Ht=null;function df(t,i){var o=At(5,null,null,0);o.elementType="DELETED",o.stateNode=i,o.return=t,i=t.deletions,i===null?(t.deletions=[o],t.flags|=16):i.push(o)}function hf(t,i){switch(t.tag){case 5:var o=t.type;return i=i.nodeType!==1||o.toLowerCase()!==i.nodeName.toLowerCase()?null:i,i!==null?(t.stateNode=i,kt=t,Ct=An(i.firstChild),!0):!1;case 6:return i=t.pendingProps===""||i.nodeType!==3?null:i,i!==null?(t.stateNode=i,kt=t,Ct=null,!0):!1;case 13:return i=i.nodeType!==8?null:i,i!==null?(o=lr!==null?{id:hn,overflow:fn}:null,t.memoizedState={dehydrated:i,treeContext:o,retryLane:1073741824},o=At(18,null,null,0),o.stateNode=i,o.return=t,t.child=o,kt=t,Ct=null,!0):!1;default:return!1}}function Ha(t){return(t.mode&1)!==0&&(t.flags&128)===0}function Va(t){if(Ee){var i=Ct;if(i){var o=i;if(!hf(t,i)){if(Ha(t))throw Error(r(418));i=An(o.nextSibling);var a=kt;i&&hf(t,i)?df(a,o):(t.flags=t.flags&-4097|2,Ee=!1,kt=t)}}else{if(Ha(t))throw Error(r(418));t.flags=t.flags&-4097|2,Ee=!1,kt=t}}}function ff(t){for(t=t.return;t!==null&&t.tag!==5&&t.tag!==3&&t.tag!==13;)t=t.return;kt=t}function vo(t){if(t!==kt)return!1;if(!Ee)return ff(t),Ee=!0,!1;var i;if((i=t.tag!==3)&&!(i=t.tag!==5)&&(i=t.type,i=i!=="head"&&i!=="body"&&!Oa(t.type,t.memoizedProps)),i&&(i=Ct)){if(Ha(t))throw pf(),Error(r(418));for(;i;)df(t,i),i=An(i.nextSibling)}if(ff(t),t.tag===13){if(t=t.memoizedState,t=t!==null?t.dehydrated:null,!t)throw Error(r(317));e:{for(t=t.nextSibling,i=0;t;){if(t.nodeType===8){var o=t.data;if(o==="/$"){if(i===0){Ct=An(t.nextSibling);break e}i--}else o!=="$"&&o!=="$!"&&o!=="$?"||i++}t=t.nextSibling}Ct=null}}else Ct=kt?An(t.stateNode.nextSibling):null;return!0}function pf(){for(var t=Ct;t;)t=An(t.nextSibling)}function Xr(){Ct=kt=null,Ee=!1}function Wa(t){Ht===null?Ht=[t]:Ht.push(t)}var Q1=ne.ReactCurrentBatchConfig;function qi(t,i,o){if(t=o.ref,t!==null&&typeof t!="function"&&typeof t!="object"){if(o._owner){if(o=o._owner,o){if(o.tag!==1)throw Error(r(309));var a=o.stateNode}if(!a)throw Error(r(147,t));var c=a,h=""+t;return i!==null&&i.ref!==null&&typeof i.ref=="function"&&i.ref._stringRef===h?i.ref:(i=function(p){var _=c.refs;p===null?delete _[h]:_[h]=p},i._stringRef=h,i)}if(typeof t!="string")throw Error(r(284));if(!o._owner)throw Error(r(290,t))}return t}function wo(t,i){throw t=Object.prototype.toString.call(i),Error(r(31,t==="[object Object]"?"object with keys {"+Object.keys(i).join(", ")+"}":t))}function mf(t){var i=t._init;return i(t._payload)}function gf(t){function i(S,C){if(t){var T=S.deletions;T===null?(S.deletions=[C],S.flags|=16):T.push(C)}}function o(S,C){if(!t)return null;for(;C!==null;)i(S,C),C=C.sibling;return null}function a(S,C){for(S=new Map;C!==null;)C.key!==null?S.set(C.key,C):S.set(C.index,C),C=C.sibling;return S}function c(S,C){return S=Hn(S,C),S.index=0,S.sibling=null,S}function h(S,C,T){return S.index=T,t?(T=S.alternate,T!==null?(T=T.index,T<C?(S.flags|=2,C):T):(S.flags|=2,C)):(S.flags|=1048576,C)}function p(S){return t&&S.alternate===null&&(S.flags|=2),S}function _(S,C,T,O){return C===null||C.tag!==6?(C=Lu(T,S.mode,O),C.return=S,C):(C=c(C,T),C.return=S,C)}function v(S,C,T,O){var W=T.type;return W===Ye?R(S,C,T.props.children,O,T.key):C!==null&&(C.elementType===W||typeof W=="object"&&W!==null&&W.$$typeof===ut&&mf(W)===C.type)?(O=c(C,T.props),O.ref=qi(S,C,T),O.return=S,O):(O=Wo(T.type,T.key,T.props,null,S.mode,O),O.ref=qi(S,C,T),O.return=S,O)}function I(S,C,T,O){return C===null||C.tag!==4||C.stateNode.containerInfo!==T.containerInfo||C.stateNode.implementation!==T.implementation?(C=bu(T,S.mode,O),C.return=S,C):(C=c(C,T.children||[]),C.return=S,C)}function R(S,C,T,O,W){return C===null||C.tag!==7?(C=gr(T,S.mode,O,W),C.return=S,C):(C=c(C,T),C.return=S,C)}function M(S,C,T){if(typeof C=="string"&&C!==""||typeof C=="number")return C=Lu(""+C,S.mode,T),C.return=S,C;if(typeof C=="object"&&C!==null){switch(C.$$typeof){case Ge:return T=Wo(C.type,C.key,C.props,null,S.mode,T),T.ref=qi(S,null,C),T.return=S,T;case be:return C=bu(C,S.mode,T),C.return=S,C;case ut:var O=C._init;return M(S,O(C._payload),T)}if(ki(C)||Q(C))return C=gr(C,S.mode,T,null),C.return=S,C;wo(S,C)}return null}function x(S,C,T,O){var W=C!==null?C.key:null;if(typeof T=="string"&&T!==""||typeof T=="number")return W!==null?null:_(S,C,""+T,O);if(typeof T=="object"&&T!==null){switch(T.$$typeof){case Ge:return T.key===W?v(S,C,T,O):null;case be:return T.key===W?I(S,C,T,O):null;case ut:return W=T._init,x(S,C,W(T._payload),O)}if(ki(T)||Q(T))return W!==null?null:R(S,C,T,O,null);wo(S,T)}return null}function F(S,C,T,O,W){if(typeof O=="string"&&O!==""||typeof O=="number")return S=S.get(T)||null,_(C,S,""+O,W);if(typeof O=="object"&&O!==null){switch(O.$$typeof){case Ge:return S=S.get(O.key===null?T:O.key)||null,v(C,S,O,W);case be:return S=S.get(O.key===null?T:O.key)||null,I(C,S,O,W);case ut:var $=O._init;return F(S,C,T,$(O._payload),W)}if(ki(O)||Q(O))return S=S.get(T)||null,R(C,S,O,W,null);wo(C,O)}return null}function j(S,C,T,O){for(var W=null,$=null,q=C,G=C=0,He=null;q!==null&&G<T.length;G++){q.index>G?(He=q,q=null):He=q.sibling;var oe=x(S,q,T[G],O);if(oe===null){q===null&&(q=He);break}t&&q&&oe.alternate===null&&i(S,q),C=h(oe,C,G),$===null?W=oe:$.sibling=oe,$=oe,q=He}if(G===T.length)return o(S,q),Ee&&ar(S,G),W;if(q===null){for(;G<T.length;G++)q=M(S,T[G],O),q!==null&&(C=h(q,C,G),$===null?W=q:$.sibling=q,$=q);return Ee&&ar(S,G),W}for(q=a(S,q);G<T.length;G++)He=F(q,S,G,T[G],O),He!==null&&(t&&He.alternate!==null&&q.delete(He.key===null?G:He.key),C=h(He,C,G),$===null?W=He:$.sibling=He,$=He);return t&&q.forEach(function(Vn){return i(S,Vn)}),Ee&&ar(S,G),W}function V(S,C,T,O){var W=Q(T);if(typeof W!="function")throw Error(r(150));if(T=W.call(T),T==null)throw Error(r(151));for(var $=W=null,q=C,G=C=0,He=null,oe=T.next();q!==null&&!oe.done;G++,oe=T.next()){q.index>G?(He=q,q=null):He=q.sibling;var Vn=x(S,q,oe.value,O);if(Vn===null){q===null&&(q=He);break}t&&q&&Vn.alternate===null&&i(S,q),C=h(Vn,C,G),$===null?W=Vn:$.sibling=Vn,$=Vn,q=He}if(oe.done)return o(S,q),Ee&&ar(S,G),W;if(q===null){for(;!oe.done;G++,oe=T.next())oe=M(S,oe.value,O),oe!==null&&(C=h(oe,C,G),$===null?W=oe:$.sibling=oe,$=oe);return Ee&&ar(S,G),W}for(q=a(S,q);!oe.done;G++,oe=T.next())oe=F(q,S,G,oe.value,O),oe!==null&&(t&&oe.alternate!==null&&q.delete(oe.key===null?G:oe.key),C=h(oe,C,G),$===null?W=oe:$.sibling=oe,$=oe);return t&&q.forEach(function(x0){return i(S,x0)}),Ee&&ar(S,G),W}function Oe(S,C,T,O){if(typeof T=="object"&&T!==null&&T.type===Ye&&T.key===null&&(T=T.props.children),typeof T=="object"&&T!==null){switch(T.$$typeof){case Ge:e:{for(var W=T.key,$=C;$!==null;){if($.key===W){if(W=T.type,W===Ye){if($.tag===7){o(S,$.sibling),C=c($,T.props.children),C.return=S,S=C;break e}}else if($.elementType===W||typeof W=="object"&&W!==null&&W.$$typeof===ut&&mf(W)===$.type){o(S,$.sibling),C=c($,T.props),C.ref=qi(S,$,T),C.return=S,S=C;break e}o(S,$);break}else i(S,$);$=$.sibling}T.type===Ye?(C=gr(T.props.children,S.mode,O,T.key),C.return=S,S=C):(O=Wo(T.type,T.key,T.props,null,S.mode,O),O.ref=qi(S,C,T),O.return=S,S=O)}return p(S);case be:e:{for($=T.key;C!==null;){if(C.key===$)if(C.tag===4&&C.stateNode.containerInfo===T.containerInfo&&C.stateNode.implementation===T.implementation){o(S,C.sibling),C=c(C,T.children||[]),C.return=S,S=C;break e}else{o(S,C);break}else i(S,C);C=C.sibling}C=bu(T,S.mode,O),C.return=S,S=C}return p(S);case ut:return $=T._init,Oe(S,C,$(T._payload),O)}if(ki(T))return j(S,C,T,O);if(Q(T))return V(S,C,T,O);wo(S,T)}return typeof T=="string"&&T!==""||typeof T=="number"?(T=""+T,C!==null&&C.tag===6?(o(S,C.sibling),C=c(C,T),C.return=S,S=C):(o(S,C),C=Lu(T,S.mode,O),C.return=S,S=C),p(S)):o(S,C)}return Oe}var Zr=gf(!0),_f=gf(!1),ko=Mn(null),Co=null,Jr=null,$a=null;function qa(){$a=Jr=Co=null}function Ka(t){var i=ko.current;ke(ko),t._currentValue=i}function Qa(t,i,o){for(;t!==null;){var a=t.alternate;if((t.childLanes&i)!==i?(t.childLanes|=i,a!==null&&(a.childLanes|=i)):a!==null&&(a.childLanes&i)!==i&&(a.childLanes|=i),t===o)break;t=t.return}}function ei(t,i){Co=t,$a=Jr=null,t=t.dependencies,t!==null&&t.firstContext!==null&&((t.lanes&i)!==0&&(ht=!0),t.firstContext=null)}function Nt(t){var i=t._currentValue;if($a!==t)if(t={context:t,memoizedValue:i,next:null},Jr===null){if(Co===null)throw Error(r(308));Jr=t,Co.dependencies={lanes:0,firstContext:t}}else Jr=Jr.next=t;return i}var ur=null;function Ga(t){ur===null?ur=[t]:ur.push(t)}function yf(t,i,o,a){var c=i.interleaved;return c===null?(o.next=o,Ga(i)):(o.next=c.next,c.next=o),i.interleaved=o,pn(t,a)}function pn(t,i){t.lanes|=i;var o=t.alternate;for(o!==null&&(o.lanes|=i),o=t,t=t.return;t!==null;)t.childLanes|=i,o=t.alternate,o!==null&&(o.childLanes|=i),o=t,t=t.return;return o.tag===3?o.stateNode:null}var Ln=!1;function Ya(t){t.updateQueue={baseState:t.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function vf(t,i){t=t.updateQueue,i.updateQueue===t&&(i.updateQueue={baseState:t.baseState,firstBaseUpdate:t.firstBaseUpdate,lastBaseUpdate:t.lastBaseUpdate,shared:t.shared,effects:t.effects})}function mn(t,i){return{eventTime:t,lane:i,tag:0,payload:null,callback:null,next:null}}function bn(t,i,o){var a=t.updateQueue;if(a===null)return null;if(a=a.shared,(re&2)!==0){var c=a.pending;return c===null?i.next=i:(i.next=c.next,c.next=i),a.pending=i,pn(t,o)}return c=a.interleaved,c===null?(i.next=i,Ga(a)):(i.next=c.next,c.next=i),a.interleaved=i,pn(t,o)}function Eo(t,i,o){if(i=i.updateQueue,i!==null&&(i=i.shared,(o&4194240)!==0)){var a=i.lanes;a&=t.pendingLanes,o|=a,i.lanes=o,ca(t,o)}}function wf(t,i){var o=t.updateQueue,a=t.alternate;if(a!==null&&(a=a.updateQueue,o===a)){var c=null,h=null;if(o=o.firstBaseUpdate,o!==null){do{var p={eventTime:o.eventTime,lane:o.lane,tag:o.tag,payload:o.payload,callback:o.callback,next:null};h===null?c=h=p:h=h.next=p,o=o.next}while(o!==null);h===null?c=h=i:h=h.next=i}else c=h=i;o={baseState:a.baseState,firstBaseUpdate:c,lastBaseUpdate:h,shared:a.shared,effects:a.effects},t.updateQueue=o;return}t=o.lastBaseUpdate,t===null?o.firstBaseUpdate=i:t.next=i,o.lastBaseUpdate=i}function So(t,i,o,a){var c=t.updateQueue;Ln=!1;var h=c.firstBaseUpdate,p=c.lastBaseUpdate,_=c.shared.pending;if(_!==null){c.shared.pending=null;var v=_,I=v.next;v.next=null,p===null?h=I:p.next=I,p=v;var R=t.alternate;R!==null&&(R=R.updateQueue,_=R.lastBaseUpdate,_!==p&&(_===null?R.firstBaseUpdate=I:_.next=I,R.lastBaseUpdate=v))}if(h!==null){var M=c.baseState;p=0,R=I=v=null,_=h;do{var x=_.lane,F=_.eventTime;if((a&x)===x){R!==null&&(R=R.next={eventTime:F,lane:0,tag:_.tag,payload:_.payload,callback:_.callback,next:null});e:{var j=t,V=_;switch(x=i,F=o,V.tag){case 1:if(j=V.payload,typeof j=="function"){M=j.call(F,M,x);break e}M=j;break e;case 3:j.flags=j.flags&-65537|128;case 0:if(j=V.payload,x=typeof j=="function"?j.call(F,M,x):j,x==null)break e;M=z({},M,x);break e;case 2:Ln=!0}}_.callback!==null&&_.lane!==0&&(t.flags|=64,x=c.effects,x===null?c.effects=[_]:x.push(_))}else F={eventTime:F,lane:x,tag:_.tag,payload:_.payload,callback:_.callback,next:null},R===null?(I=R=F,v=M):R=R.next=F,p|=x;if(_=_.next,_===null){if(_=c.shared.pending,_===null)break;x=_,_=x.next,x.next=null,c.lastBaseUpdate=x,c.shared.pending=null}}while(!0);if(R===null&&(v=M),c.baseState=v,c.firstBaseUpdate=I,c.lastBaseUpdate=R,i=c.shared.interleaved,i!==null){c=i;do p|=c.lane,c=c.next;while(c!==i)}else h===null&&(c.shared.lanes=0);hr|=p,t.lanes=p,t.memoizedState=M}}function kf(t,i,o){if(t=i.effects,i.effects=null,t!==null)for(i=0;i<t.length;i++){var a=t[i],c=a.callback;if(c!==null){if(a.callback=null,a=o,typeof c!="function")throw Error(r(191,c));c.call(a)}}}var Ki={},tn=Mn(Ki),Qi=Mn(Ki),Gi=Mn(Ki);function cr(t){if(t===Ki)throw Error(r(174));return t}function Xa(t,i){switch(ge(Gi,i),ge(Qi,t),ge(tn,Ki),t=i.nodeType,t){case 9:case 11:i=(i=i.documentElement)?i.namespaceURI:Zl(null,"");break;default:t=t===8?i.parentNode:i,i=t.namespaceURI||null,t=t.tagName,i=Zl(i,t)}ke(tn),ge(tn,i)}function ti(){ke(tn),ke(Qi),ke(Gi)}function Cf(t){cr(Gi.current);var i=cr(tn.current),o=Zl(i,t.type);i!==o&&(ge(Qi,t),ge(tn,o))}function Za(t){Qi.current===t&&(ke(tn),ke(Qi))}var Te=Mn(0);function To(t){for(var i=t;i!==null;){if(i.tag===13){var o=i.memoizedState;if(o!==null&&(o=o.dehydrated,o===null||o.data==="$?"||o.data==="$!"))return i}else if(i.tag===19&&i.memoizedProps.revealOrder!==void 0){if((i.flags&128)!==0)return i}else if(i.child!==null){i.child.return=i,i=i.child;continue}if(i===t)break;for(;i.sibling===null;){if(i.return===null||i.return===t)return null;i=i.return}i.sibling.return=i.return,i=i.sibling}return null}var Ja=[];function eu(){for(var t=0;t<Ja.length;t++)Ja[t]._workInProgressVersionPrimary=null;Ja.length=0}var Io=ne.ReactCurrentDispatcher,tu=ne.ReactCurrentBatchConfig,dr=0,Ie=null,Fe=null,ze=null,xo=!1,Yi=!1,Xi=0,G1=0;function Je(){throw Error(r(321))}function nu(t,i){if(i===null)return!1;for(var o=0;o<i.length&&o<t.length;o++)if(!jt(t[o],i[o]))return!1;return!0}function ru(t,i,o,a,c,h){if(dr=h,Ie=i,i.memoizedState=null,i.updateQueue=null,i.lanes=0,Io.current=t===null||t.memoizedState===null?J1:e0,t=o(a,c),Yi){h=0;do{if(Yi=!1,Xi=0,25<=h)throw Error(r(301));h+=1,ze=Fe=null,i.updateQueue=null,Io.current=t0,t=o(a,c)}while(Yi)}if(Io.current=Po,i=Fe!==null&&Fe.next!==null,dr=0,ze=Fe=Ie=null,xo=!1,i)throw Error(r(300));return t}function iu(){var t=Xi!==0;return Xi=0,t}function nn(){var t={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return ze===null?Ie.memoizedState=ze=t:ze=ze.next=t,ze}function Rt(){if(Fe===null){var t=Ie.alternate;t=t!==null?t.memoizedState:null}else t=Fe.next;var i=ze===null?Ie.memoizedState:ze.next;if(i!==null)ze=i,Fe=t;else{if(t===null)throw Error(r(310));Fe=t,t={memoizedState:Fe.memoizedState,baseState:Fe.baseState,baseQueue:Fe.baseQueue,queue:Fe.queue,next:null},ze===null?Ie.memoizedState=ze=t:ze=ze.next=t}return ze}function Zi(t,i){return typeof i=="function"?i(t):i}function su(t){var i=Rt(),o=i.queue;if(o===null)throw Error(r(311));o.lastRenderedReducer=t;var a=Fe,c=a.baseQueue,h=o.pending;if(h!==null){if(c!==null){var p=c.next;c.next=h.next,h.next=p}a.baseQueue=c=h,o.pending=null}if(c!==null){h=c.next,a=a.baseState;var _=p=null,v=null,I=h;do{var R=I.lane;if((dr&R)===R)v!==null&&(v=v.next={lane:0,action:I.action,hasEagerState:I.hasEagerState,eagerState:I.eagerState,next:null}),a=I.hasEagerState?I.eagerState:t(a,I.action);else{var M={lane:R,action:I.action,hasEagerState:I.hasEagerState,eagerState:I.eagerState,next:null};v===null?(_=v=M,p=a):v=v.next=M,Ie.lanes|=R,hr|=R}I=I.next}while(I!==null&&I!==h);v===null?p=a:v.next=_,jt(a,i.memoizedState)||(ht=!0),i.memoizedState=a,i.baseState=p,i.baseQueue=v,o.lastRenderedState=a}if(t=o.interleaved,t!==null){c=t;do h=c.lane,Ie.lanes|=h,hr|=h,c=c.next;while(c!==t)}else c===null&&(o.lanes=0);return[i.memoizedState,o.dispatch]}function ou(t){var i=Rt(),o=i.queue;if(o===null)throw Error(r(311));o.lastRenderedReducer=t;var a=o.dispatch,c=o.pending,h=i.memoizedState;if(c!==null){o.pending=null;var p=c=c.next;do h=t(h,p.action),p=p.next;while(p!==c);jt(h,i.memoizedState)||(ht=!0),i.memoizedState=h,i.baseQueue===null&&(i.baseState=h),o.lastRenderedState=h}return[h,a]}function Ef(){}function Sf(t,i){var o=Ie,a=Rt(),c=i(),h=!jt(a.memoizedState,c);if(h&&(a.memoizedState=c,ht=!0),a=a.queue,lu(xf.bind(null,o,a,t),[t]),a.getSnapshot!==i||h||ze!==null&&ze.memoizedState.tag&1){if(o.flags|=2048,Ji(9,If.bind(null,o,a,c,i),void 0,null),je===null)throw Error(r(349));(dr&30)!==0||Tf(o,i,c)}return c}function Tf(t,i,o){t.flags|=16384,t={getSnapshot:i,value:o},i=Ie.updateQueue,i===null?(i={lastEffect:null,stores:null},Ie.updateQueue=i,i.stores=[t]):(o=i.stores,o===null?i.stores=[t]:o.push(t))}function If(t,i,o,a){i.value=o,i.getSnapshot=a,Nf(i)&&Rf(t)}function xf(t,i,o){return o(function(){Nf(i)&&Rf(t)})}function Nf(t){var i=t.getSnapshot;t=t.value;try{var o=i();return!jt(t,o)}catch{return!0}}function Rf(t){var i=pn(t,1);i!==null&&qt(i,t,1,-1)}function Pf(t){var i=nn();return typeof t=="function"&&(t=t()),i.memoizedState=i.baseState=t,t={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:Zi,lastRenderedState:t},i.queue=t,t=t.dispatch=Z1.bind(null,Ie,t),[i.memoizedState,t]}function Ji(t,i,o,a){return t={tag:t,create:i,destroy:o,deps:a,next:null},i=Ie.updateQueue,i===null?(i={lastEffect:null,stores:null},Ie.updateQueue=i,i.lastEffect=t.next=t):(o=i.lastEffect,o===null?i.lastEffect=t.next=t:(a=o.next,o.next=t,t.next=a,i.lastEffect=t)),t}function Af(){return Rt().memoizedState}function No(t,i,o,a){var c=nn();Ie.flags|=t,c.memoizedState=Ji(1|i,o,void 0,a===void 0?null:a)}function Ro(t,i,o,a){var c=Rt();a=a===void 0?null:a;var h=void 0;if(Fe!==null){var p=Fe.memoizedState;if(h=p.destroy,a!==null&&nu(a,p.deps)){c.memoizedState=Ji(i,o,h,a);return}}Ie.flags|=t,c.memoizedState=Ji(1|i,o,h,a)}function Mf(t,i){return No(8390656,8,t,i)}function lu(t,i){return Ro(2048,8,t,i)}function Df(t,i){return Ro(4,2,t,i)}function Of(t,i){return Ro(4,4,t,i)}function Lf(t,i){if(typeof i=="function")return t=t(),i(t),function(){i(null)};if(i!=null)return t=t(),i.current=t,function(){i.current=null}}function bf(t,i,o){return o=o!=null?o.concat([t]):null,Ro(4,4,Lf.bind(null,i,t),o)}function au(){}function Ff(t,i){var o=Rt();i=i===void 0?null:i;var a=o.memoizedState;return a!==null&&i!==null&&nu(i,a[1])?a[0]:(o.memoizedState=[t,i],t)}function Uf(t,i){var o=Rt();i=i===void 0?null:i;var a=o.memoizedState;return a!==null&&i!==null&&nu(i,a[1])?a[0]:(t=t(),o.memoizedState=[t,i],t)}function Bf(t,i,o){return(dr&21)===0?(t.baseState&&(t.baseState=!1,ht=!0),t.memoizedState=o):(jt(o,i)||(o=ph(),Ie.lanes|=o,hr|=o,t.baseState=!0),i)}function Y1(t,i){var o=de;de=o!==0&&4>o?o:4,t(!0);var a=tu.transition;tu.transition={};try{t(!1),i()}finally{de=o,tu.transition=a}}function zf(){return Rt().memoizedState}function X1(t,i,o){var a=zn(t);if(o={lane:a,action:o,hasEagerState:!1,eagerState:null,next:null},jf(t))Hf(i,o);else if(o=yf(t,i,o,a),o!==null){var c=st();qt(o,t,a,c),Vf(o,i,a)}}function Z1(t,i,o){var a=zn(t),c={lane:a,action:o,hasEagerState:!1,eagerState:null,next:null};if(jf(t))Hf(i,c);else{var h=t.alternate;if(t.lanes===0&&(h===null||h.lanes===0)&&(h=i.lastRenderedReducer,h!==null))try{var p=i.lastRenderedState,_=h(p,o);if(c.hasEagerState=!0,c.eagerState=_,jt(_,p)){var v=i.interleaved;v===null?(c.next=c,Ga(i)):(c.next=v.next,v.next=c),i.interleaved=c;return}}catch{}finally{}o=yf(t,i,c,a),o!==null&&(c=st(),qt(o,t,a,c),Vf(o,i,a))}}function jf(t){var i=t.alternate;return t===Ie||i!==null&&i===Ie}function Hf(t,i){Yi=xo=!0;var o=t.pending;o===null?i.next=i:(i.next=o.next,o.next=i),t.pending=i}function Vf(t,i,o){if((o&4194240)!==0){var a=i.lanes;a&=t.pendingLanes,o|=a,i.lanes=o,ca(t,o)}}var Po={readContext:Nt,useCallback:Je,useContext:Je,useEffect:Je,useImperativeHandle:Je,useInsertionEffect:Je,useLayoutEffect:Je,useMemo:Je,useReducer:Je,useRef:Je,useState:Je,useDebugValue:Je,useDeferredValue:Je,useTransition:Je,useMutableSource:Je,useSyncExternalStore:Je,useId:Je,unstable_isNewReconciler:!1},J1={readContext:Nt,useCallback:function(t,i){return nn().memoizedState=[t,i===void 0?null:i],t},useContext:Nt,useEffect:Mf,useImperativeHandle:function(t,i,o){return o=o!=null?o.concat([t]):null,No(4194308,4,Lf.bind(null,i,t),o)},useLayoutEffect:function(t,i){return No(4194308,4,t,i)},useInsertionEffect:function(t,i){return No(4,2,t,i)},useMemo:function(t,i){var o=nn();return i=i===void 0?null:i,t=t(),o.memoizedState=[t,i],t},useReducer:function(t,i,o){var a=nn();return i=o!==void 0?o(i):i,a.memoizedState=a.baseState=i,t={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:t,lastRenderedState:i},a.queue=t,t=t.dispatch=X1.bind(null,Ie,t),[a.memoizedState,t]},useRef:function(t){var i=nn();return t={current:t},i.memoizedState=t},useState:Pf,useDebugValue:au,useDeferredValue:function(t){return nn().memoizedState=t},useTransition:function(){var t=Pf(!1),i=t[0];return t=Y1.bind(null,t[1]),nn().memoizedState=t,[i,t]},useMutableSource:function(){},useSyncExternalStore:function(t,i,o){var a=Ie,c=nn();if(Ee){if(o===void 0)throw Error(r(407));o=o()}else{if(o=i(),je===null)throw Error(r(349));(dr&30)!==0||Tf(a,i,o)}c.memoizedState=o;var h={value:o,getSnapshot:i};return c.queue=h,Mf(xf.bind(null,a,h,t),[t]),a.flags|=2048,Ji(9,If.bind(null,a,h,o,i),void 0,null),o},useId:function(){var t=nn(),i=je.identifierPrefix;if(Ee){var o=fn,a=hn;o=(a&~(1<<32-zt(a)-1)).toString(32)+o,i=":"+i+"R"+o,o=Xi++,0<o&&(i+="H"+o.toString(32)),i+=":"}else o=G1++,i=":"+i+"r"+o.toString(32)+":";return t.memoizedState=i},unstable_isNewReconciler:!1},e0={readContext:Nt,useCallback:Ff,useContext:Nt,useEffect:lu,useImperativeHandle:bf,useInsertionEffect:Df,useLayoutEffect:Of,useMemo:Uf,useReducer:su,useRef:Af,useState:function(){return su(Zi)},useDebugValue:au,useDeferredValue:function(t){var i=Rt();return Bf(i,Fe.memoizedState,t)},useTransition:function(){var t=su(Zi)[0],i=Rt().memoizedState;return[t,i]},useMutableSource:Ef,useSyncExternalStore:Sf,useId:zf,unstable_isNewReconciler:!1},t0={readContext:Nt,useCallback:Ff,useContext:Nt,useEffect:lu,useImperativeHandle:bf,useInsertionEffect:Df,useLayoutEffect:Of,useMemo:Uf,useReducer:ou,useRef:Af,useState:function(){return ou(Zi)},useDebugValue:au,useDeferredValue:function(t){var i=Rt();return Fe===null?i.memoizedState=t:Bf(i,Fe.memoizedState,t)},useTransition:function(){var t=ou(Zi)[0],i=Rt().memoizedState;return[t,i]},useMutableSource:Ef,useSyncExternalStore:Sf,useId:zf,unstable_isNewReconciler:!1};function Vt(t,i){if(t&&t.defaultProps){i=z({},i),t=t.defaultProps;for(var o in t)i[o]===void 0&&(i[o]=t[o]);return i}return i}function uu(t,i,o,a){i=t.memoizedState,o=o(a,i),o=o==null?i:z({},i,o),t.memoizedState=o,t.lanes===0&&(t.updateQueue.baseState=o)}var Ao={isMounted:function(t){return(t=t._reactInternals)?ir(t)===t:!1},enqueueSetState:function(t,i,o){t=t._reactInternals;var a=st(),c=zn(t),h=mn(a,c);h.payload=i,o!=null&&(h.callback=o),i=bn(t,h,c),i!==null&&(qt(i,t,c,a),Eo(i,t,c))},enqueueReplaceState:function(t,i,o){t=t._reactInternals;var a=st(),c=zn(t),h=mn(a,c);h.tag=1,h.payload=i,o!=null&&(h.callback=o),i=bn(t,h,c),i!==null&&(qt(i,t,c,a),Eo(i,t,c))},enqueueForceUpdate:function(t,i){t=t._reactInternals;var o=st(),a=zn(t),c=mn(o,a);c.tag=2,i!=null&&(c.callback=i),i=bn(t,c,a),i!==null&&(qt(i,t,a,o),Eo(i,t,a))}};function Wf(t,i,o,a,c,h,p){return t=t.stateNode,typeof t.shouldComponentUpdate=="function"?t.shouldComponentUpdate(a,h,p):i.prototype&&i.prototype.isPureReactComponent?!Bi(o,a)||!Bi(c,h):!0}function $f(t,i,o){var a=!1,c=Dn,h=i.contextType;return typeof h=="object"&&h!==null?h=Nt(h):(c=dt(i)?or:Ze.current,a=i.contextTypes,h=(a=a!=null)?Qr(t,c):Dn),i=new i(o,h),t.memoizedState=i.state!==null&&i.state!==void 0?i.state:null,i.updater=Ao,t.stateNode=i,i._reactInternals=t,a&&(t=t.stateNode,t.__reactInternalMemoizedUnmaskedChildContext=c,t.__reactInternalMemoizedMaskedChildContext=h),i}function qf(t,i,o,a){t=i.state,typeof i.componentWillReceiveProps=="function"&&i.componentWillReceiveProps(o,a),typeof i.UNSAFE_componentWillReceiveProps=="function"&&i.UNSAFE_componentWillReceiveProps(o,a),i.state!==t&&Ao.enqueueReplaceState(i,i.state,null)}function cu(t,i,o,a){var c=t.stateNode;c.props=o,c.state=t.memoizedState,c.refs={},Ya(t);var h=i.contextType;typeof h=="object"&&h!==null?c.context=Nt(h):(h=dt(i)?or:Ze.current,c.context=Qr(t,h)),c.state=t.memoizedState,h=i.getDerivedStateFromProps,typeof h=="function"&&(uu(t,i,h,o),c.state=t.memoizedState),typeof i.getDerivedStateFromProps=="function"||typeof c.getSnapshotBeforeUpdate=="function"||typeof c.UNSAFE_componentWillMount!="function"&&typeof c.componentWillMount!="function"||(i=c.state,typeof c.componentWillMount=="function"&&c.componentWillMount(),typeof c.UNSAFE_componentWillMount=="function"&&c.UNSAFE_componentWillMount(),i!==c.state&&Ao.enqueueReplaceState(c,c.state,null),So(t,o,c,a),c.state=t.memoizedState),typeof c.componentDidMount=="function"&&(t.flags|=4194308)}function ni(t,i){try{var o="",a=i;do o+=ie(a),a=a.return;while(a);var c=o}catch(h){c=`
Error generating stack: `+h.message+`
`+h.stack}return{value:t,source:i,stack:c,digest:null}}function du(t,i,o){return{value:t,source:null,stack:o??null,digest:i??null}}function hu(t,i){try{console.error(i.value)}catch(o){setTimeout(function(){throw o})}}var n0=typeof WeakMap=="function"?WeakMap:Map;function Kf(t,i,o){o=mn(-1,o),o.tag=3,o.payload={element:null};var a=i.value;return o.callback=function(){Uo||(Uo=!0,xu=a),hu(t,i)},o}function Qf(t,i,o){o=mn(-1,o),o.tag=3;var a=t.type.getDerivedStateFromError;if(typeof a=="function"){var c=i.value;o.payload=function(){return a(c)},o.callback=function(){hu(t,i)}}var h=t.stateNode;return h!==null&&typeof h.componentDidCatch=="function"&&(o.callback=function(){hu(t,i),typeof a!="function"&&(Un===null?Un=new Set([this]):Un.add(this));var p=i.stack;this.componentDidCatch(i.value,{componentStack:p!==null?p:""})}),o}function Gf(t,i,o){var a=t.pingCache;if(a===null){a=t.pingCache=new n0;var c=new Set;a.set(i,c)}else c=a.get(i),c===void 0&&(c=new Set,a.set(i,c));c.has(o)||(c.add(o),t=g0.bind(null,t,i,o),i.then(t,t))}function Yf(t){do{var i;if((i=t.tag===13)&&(i=t.memoizedState,i=i!==null?i.dehydrated!==null:!0),i)return t;t=t.return}while(t!==null);return null}function Xf(t,i,o,a,c){return(t.mode&1)===0?(t===i?t.flags|=65536:(t.flags|=128,o.flags|=131072,o.flags&=-52805,o.tag===1&&(o.alternate===null?o.tag=17:(i=mn(-1,1),i.tag=2,bn(o,i,1))),o.lanes|=1),t):(t.flags|=65536,t.lanes=c,t)}var r0=ne.ReactCurrentOwner,ht=!1;function it(t,i,o,a){i.child=t===null?_f(i,null,o,a):Zr(i,t.child,o,a)}function Zf(t,i,o,a,c){o=o.render;var h=i.ref;return ei(i,c),a=ru(t,i,o,a,h,c),o=iu(),t!==null&&!ht?(i.updateQueue=t.updateQueue,i.flags&=-2053,t.lanes&=~c,gn(t,i,c)):(Ee&&o&&za(i),i.flags|=1,it(t,i,a,c),i.child)}function Jf(t,i,o,a,c){if(t===null){var h=o.type;return typeof h=="function"&&!Ou(h)&&h.defaultProps===void 0&&o.compare===null&&o.defaultProps===void 0?(i.tag=15,i.type=h,ep(t,i,h,a,c)):(t=Wo(o.type,null,a,i,i.mode,c),t.ref=i.ref,t.return=i,i.child=t)}if(h=t.child,(t.lanes&c)===0){var p=h.memoizedProps;if(o=o.compare,o=o!==null?o:Bi,o(p,a)&&t.ref===i.ref)return gn(t,i,c)}return i.flags|=1,t=Hn(h,a),t.ref=i.ref,t.return=i,i.child=t}function ep(t,i,o,a,c){if(t!==null){var h=t.memoizedProps;if(Bi(h,a)&&t.ref===i.ref)if(ht=!1,i.pendingProps=a=h,(t.lanes&c)!==0)(t.flags&131072)!==0&&(ht=!0);else return i.lanes=t.lanes,gn(t,i,c)}return fu(t,i,o,a,c)}function tp(t,i,o){var a=i.pendingProps,c=a.children,h=t!==null?t.memoizedState:null;if(a.mode==="hidden")if((i.mode&1)===0)i.memoizedState={baseLanes:0,cachePool:null,transitions:null},ge(ii,Et),Et|=o;else{if((o&1073741824)===0)return t=h!==null?h.baseLanes|o:o,i.lanes=i.childLanes=1073741824,i.memoizedState={baseLanes:t,cachePool:null,transitions:null},i.updateQueue=null,ge(ii,Et),Et|=t,null;i.memoizedState={baseLanes:0,cachePool:null,transitions:null},a=h!==null?h.baseLanes:o,ge(ii,Et),Et|=a}else h!==null?(a=h.baseLanes|o,i.memoizedState=null):a=o,ge(ii,Et),Et|=a;return it(t,i,c,o),i.child}function np(t,i){var o=i.ref;(t===null&&o!==null||t!==null&&t.ref!==o)&&(i.flags|=512,i.flags|=2097152)}function fu(t,i,o,a,c){var h=dt(o)?or:Ze.current;return h=Qr(i,h),ei(i,c),o=ru(t,i,o,a,h,c),a=iu(),t!==null&&!ht?(i.updateQueue=t.updateQueue,i.flags&=-2053,t.lanes&=~c,gn(t,i,c)):(Ee&&a&&za(i),i.flags|=1,it(t,i,o,c),i.child)}function rp(t,i,o,a,c){if(dt(o)){var h=!0;mo(i)}else h=!1;if(ei(i,c),i.stateNode===null)Do(t,i),$f(i,o,a),cu(i,o,a,c),a=!0;else if(t===null){var p=i.stateNode,_=i.memoizedProps;p.props=_;var v=p.context,I=o.contextType;typeof I=="object"&&I!==null?I=Nt(I):(I=dt(o)?or:Ze.current,I=Qr(i,I));var R=o.getDerivedStateFromProps,M=typeof R=="function"||typeof p.getSnapshotBeforeUpdate=="function";M||typeof p.UNSAFE_componentWillReceiveProps!="function"&&typeof p.componentWillReceiveProps!="function"||(_!==a||v!==I)&&qf(i,p,a,I),Ln=!1;var x=i.memoizedState;p.state=x,So(i,a,p,c),v=i.memoizedState,_!==a||x!==v||ct.current||Ln?(typeof R=="function"&&(uu(i,o,R,a),v=i.memoizedState),(_=Ln||Wf(i,o,_,a,x,v,I))?(M||typeof p.UNSAFE_componentWillMount!="function"&&typeof p.componentWillMount!="function"||(typeof p.componentWillMount=="function"&&p.componentWillMount(),typeof p.UNSAFE_componentWillMount=="function"&&p.UNSAFE_componentWillMount()),typeof p.componentDidMount=="function"&&(i.flags|=4194308)):(typeof p.componentDidMount=="function"&&(i.flags|=4194308),i.memoizedProps=a,i.memoizedState=v),p.props=a,p.state=v,p.context=I,a=_):(typeof p.componentDidMount=="function"&&(i.flags|=4194308),a=!1)}else{p=i.stateNode,vf(t,i),_=i.memoizedProps,I=i.type===i.elementType?_:Vt(i.type,_),p.props=I,M=i.pendingProps,x=p.context,v=o.contextType,typeof v=="object"&&v!==null?v=Nt(v):(v=dt(o)?or:Ze.current,v=Qr(i,v));var F=o.getDerivedStateFromProps;(R=typeof F=="function"||typeof p.getSnapshotBeforeUpdate=="function")||typeof p.UNSAFE_componentWillReceiveProps!="function"&&typeof p.componentWillReceiveProps!="function"||(_!==M||x!==v)&&qf(i,p,a,v),Ln=!1,x=i.memoizedState,p.state=x,So(i,a,p,c);var j=i.memoizedState;_!==M||x!==j||ct.current||Ln?(typeof F=="function"&&(uu(i,o,F,a),j=i.memoizedState),(I=Ln||Wf(i,o,I,a,x,j,v)||!1)?(R||typeof p.UNSAFE_componentWillUpdate!="function"&&typeof p.componentWillUpdate!="function"||(typeof p.componentWillUpdate=="function"&&p.componentWillUpdate(a,j,v),typeof p.UNSAFE_componentWillUpdate=="function"&&p.UNSAFE_componentWillUpdate(a,j,v)),typeof p.componentDidUpdate=="function"&&(i.flags|=4),typeof p.getSnapshotBeforeUpdate=="function"&&(i.flags|=1024)):(typeof p.componentDidUpdate!="function"||_===t.memoizedProps&&x===t.memoizedState||(i.flags|=4),typeof p.getSnapshotBeforeUpdate!="function"||_===t.memoizedProps&&x===t.memoizedState||(i.flags|=1024),i.memoizedProps=a,i.memoizedState=j),p.props=a,p.state=j,p.context=v,a=I):(typeof p.componentDidUpdate!="function"||_===t.memoizedProps&&x===t.memoizedState||(i.flags|=4),typeof p.getSnapshotBeforeUpdate!="function"||_===t.memoizedProps&&x===t.memoizedState||(i.flags|=1024),a=!1)}return pu(t,i,o,a,h,c)}function pu(t,i,o,a,c,h){np(t,i);var p=(i.flags&128)!==0;if(!a&&!p)return c&&af(i,o,!1),gn(t,i,h);a=i.stateNode,r0.current=i;var _=p&&typeof o.getDerivedStateFromError!="function"?null:a.render();return i.flags|=1,t!==null&&p?(i.child=Zr(i,t.child,null,h),i.child=Zr(i,null,_,h)):it(t,i,_,h),i.memoizedState=a.state,c&&af(i,o,!0),i.child}function ip(t){var i=t.stateNode;i.pendingContext?of(t,i.pendingContext,i.pendingContext!==i.context):i.context&&of(t,i.context,!1),Xa(t,i.containerInfo)}function sp(t,i,o,a,c){return Xr(),Wa(c),i.flags|=256,it(t,i,o,a),i.child}var mu={dehydrated:null,treeContext:null,retryLane:0};function gu(t){return{baseLanes:t,cachePool:null,transitions:null}}function op(t,i,o){var a=i.pendingProps,c=Te.current,h=!1,p=(i.flags&128)!==0,_;if((_=p)||(_=t!==null&&t.memoizedState===null?!1:(c&2)!==0),_?(h=!0,i.flags&=-129):(t===null||t.memoizedState!==null)&&(c|=1),ge(Te,c&1),t===null)return Va(i),t=i.memoizedState,t!==null&&(t=t.dehydrated,t!==null)?((i.mode&1)===0?i.lanes=1:t.data==="$!"?i.lanes=8:i.lanes=1073741824,null):(p=a.children,t=a.fallback,h?(a=i.mode,h=i.child,p={mode:"hidden",children:p},(a&1)===0&&h!==null?(h.childLanes=0,h.pendingProps=p):h=$o(p,a,0,null),t=gr(t,a,o,null),h.return=i,t.return=i,h.sibling=t,i.child=h,i.child.memoizedState=gu(o),i.memoizedState=mu,t):_u(i,p));if(c=t.memoizedState,c!==null&&(_=c.dehydrated,_!==null))return i0(t,i,p,a,_,c,o);if(h){h=a.fallback,p=i.mode,c=t.child,_=c.sibling;var v={mode:"hidden",children:a.children};return(p&1)===0&&i.child!==c?(a=i.child,a.childLanes=0,a.pendingProps=v,i.deletions=null):(a=Hn(c,v),a.subtreeFlags=c.subtreeFlags&14680064),_!==null?h=Hn(_,h):(h=gr(h,p,o,null),h.flags|=2),h.return=i,a.return=i,a.sibling=h,i.child=a,a=h,h=i.child,p=t.child.memoizedState,p=p===null?gu(o):{baseLanes:p.baseLanes|o,cachePool:null,transitions:p.transitions},h.memoizedState=p,h.childLanes=t.childLanes&~o,i.memoizedState=mu,a}return h=t.child,t=h.sibling,a=Hn(h,{mode:"visible",children:a.children}),(i.mode&1)===0&&(a.lanes=o),a.return=i,a.sibling=null,t!==null&&(o=i.deletions,o===null?(i.deletions=[t],i.flags|=16):o.push(t)),i.child=a,i.memoizedState=null,a}function _u(t,i){return i=$o({mode:"visible",children:i},t.mode,0,null),i.return=t,t.child=i}function Mo(t,i,o,a){return a!==null&&Wa(a),Zr(i,t.child,null,o),t=_u(i,i.pendingProps.children),t.flags|=2,i.memoizedState=null,t}function i0(t,i,o,a,c,h,p){if(o)return i.flags&256?(i.flags&=-257,a=du(Error(r(422))),Mo(t,i,p,a)):i.memoizedState!==null?(i.child=t.child,i.flags|=128,null):(h=a.fallback,c=i.mode,a=$o({mode:"visible",children:a.children},c,0,null),h=gr(h,c,p,null),h.flags|=2,a.return=i,h.return=i,a.sibling=h,i.child=a,(i.mode&1)!==0&&Zr(i,t.child,null,p),i.child.memoizedState=gu(p),i.memoizedState=mu,h);if((i.mode&1)===0)return Mo(t,i,p,null);if(c.data==="$!"){if(a=c.nextSibling&&c.nextSibling.dataset,a)var _=a.dgst;return a=_,h=Error(r(419)),a=du(h,a,void 0),Mo(t,i,p,a)}if(_=(p&t.childLanes)!==0,ht||_){if(a=je,a!==null){switch(p&-p){case 4:c=2;break;case 16:c=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:c=32;break;case 536870912:c=268435456;break;default:c=0}c=(c&(a.suspendedLanes|p))!==0?0:c,c!==0&&c!==h.retryLane&&(h.retryLane=c,pn(t,c),qt(a,t,c,-1))}return Du(),a=du(Error(r(421))),Mo(t,i,p,a)}return c.data==="$?"?(i.flags|=128,i.child=t.child,i=_0.bind(null,t),c._reactRetry=i,null):(t=h.treeContext,Ct=An(c.nextSibling),kt=i,Ee=!0,Ht=null,t!==null&&(It[xt++]=hn,It[xt++]=fn,It[xt++]=lr,hn=t.id,fn=t.overflow,lr=i),i=_u(i,a.children),i.flags|=4096,i)}function lp(t,i,o){t.lanes|=i;var a=t.alternate;a!==null&&(a.lanes|=i),Qa(t.return,i,o)}function yu(t,i,o,a,c){var h=t.memoizedState;h===null?t.memoizedState={isBackwards:i,rendering:null,renderingStartTime:0,last:a,tail:o,tailMode:c}:(h.isBackwards=i,h.rendering=null,h.renderingStartTime=0,h.last=a,h.tail=o,h.tailMode=c)}function ap(t,i,o){var a=i.pendingProps,c=a.revealOrder,h=a.tail;if(it(t,i,a.children,o),a=Te.current,(a&2)!==0)a=a&1|2,i.flags|=128;else{if(t!==null&&(t.flags&128)!==0)e:for(t=i.child;t!==null;){if(t.tag===13)t.memoizedState!==null&&lp(t,o,i);else if(t.tag===19)lp(t,o,i);else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===i)break e;for(;t.sibling===null;){if(t.return===null||t.return===i)break e;t=t.return}t.sibling.return=t.return,t=t.sibling}a&=1}if(ge(Te,a),(i.mode&1)===0)i.memoizedState=null;else switch(c){case"forwards":for(o=i.child,c=null;o!==null;)t=o.alternate,t!==null&&To(t)===null&&(c=o),o=o.sibling;o=c,o===null?(c=i.child,i.child=null):(c=o.sibling,o.sibling=null),yu(i,!1,c,o,h);break;case"backwards":for(o=null,c=i.child,i.child=null;c!==null;){if(t=c.alternate,t!==null&&To(t)===null){i.child=c;break}t=c.sibling,c.sibling=o,o=c,c=t}yu(i,!0,o,null,h);break;case"together":yu(i,!1,null,null,void 0);break;default:i.memoizedState=null}return i.child}function Do(t,i){(i.mode&1)===0&&t!==null&&(t.alternate=null,i.alternate=null,i.flags|=2)}function gn(t,i,o){if(t!==null&&(i.dependencies=t.dependencies),hr|=i.lanes,(o&i.childLanes)===0)return null;if(t!==null&&i.child!==t.child)throw Error(r(153));if(i.child!==null){for(t=i.child,o=Hn(t,t.pendingProps),i.child=o,o.return=i;t.sibling!==null;)t=t.sibling,o=o.sibling=Hn(t,t.pendingProps),o.return=i;o.sibling=null}return i.child}function s0(t,i,o){switch(i.tag){case 3:ip(i),Xr();break;case 5:Cf(i);break;case 1:dt(i.type)&&mo(i);break;case 4:Xa(i,i.stateNode.containerInfo);break;case 10:var a=i.type._context,c=i.memoizedProps.value;ge(ko,a._currentValue),a._currentValue=c;break;case 13:if(a=i.memoizedState,a!==null)return a.dehydrated!==null?(ge(Te,Te.current&1),i.flags|=128,null):(o&i.child.childLanes)!==0?op(t,i,o):(ge(Te,Te.current&1),t=gn(t,i,o),t!==null?t.sibling:null);ge(Te,Te.current&1);break;case 19:if(a=(o&i.childLanes)!==0,(t.flags&128)!==0){if(a)return ap(t,i,o);i.flags|=128}if(c=i.memoizedState,c!==null&&(c.rendering=null,c.tail=null,c.lastEffect=null),ge(Te,Te.current),a)break;return null;case 22:case 23:return i.lanes=0,tp(t,i,o)}return gn(t,i,o)}var up,vu,cp,dp;up=function(t,i){for(var o=i.child;o!==null;){if(o.tag===5||o.tag===6)t.appendChild(o.stateNode);else if(o.tag!==4&&o.child!==null){o.child.return=o,o=o.child;continue}if(o===i)break;for(;o.sibling===null;){if(o.return===null||o.return===i)return;o=o.return}o.sibling.return=o.return,o=o.sibling}},vu=function(){},cp=function(t,i,o,a){var c=t.memoizedProps;if(c!==a){t=i.stateNode,cr(tn.current);var h=null;switch(o){case"input":c=Ql(t,c),a=Ql(t,a),h=[];break;case"select":c=z({},c,{value:void 0}),a=z({},a,{value:void 0}),h=[];break;case"textarea":c=Xl(t,c),a=Xl(t,a),h=[];break;default:typeof c.onClick!="function"&&typeof a.onClick=="function"&&(t.onclick=ho)}Jl(o,a);var p;o=null;for(I in c)if(!a.hasOwnProperty(I)&&c.hasOwnProperty(I)&&c[I]!=null)if(I==="style"){var _=c[I];for(p in _)_.hasOwnProperty(p)&&(o||(o={}),o[p]="")}else I!=="dangerouslySetInnerHTML"&&I!=="children"&&I!=="suppressContentEditableWarning"&&I!=="suppressHydrationWarning"&&I!=="autoFocus"&&(l.hasOwnProperty(I)?h||(h=[]):(h=h||[]).push(I,null));for(I in a){var v=a[I];if(_=c!=null?c[I]:void 0,a.hasOwnProperty(I)&&v!==_&&(v!=null||_!=null))if(I==="style")if(_){for(p in _)!_.hasOwnProperty(p)||v&&v.hasOwnProperty(p)||(o||(o={}),o[p]="");for(p in v)v.hasOwnProperty(p)&&_[p]!==v[p]&&(o||(o={}),o[p]=v[p])}else o||(h||(h=[]),h.push(I,o)),o=v;else I==="dangerouslySetInnerHTML"?(v=v?v.__html:void 0,_=_?_.__html:void 0,v!=null&&_!==v&&(h=h||[]).push(I,v)):I==="children"?typeof v!="string"&&typeof v!="number"||(h=h||[]).push(I,""+v):I!=="suppressContentEditableWarning"&&I!=="suppressHydrationWarning"&&(l.hasOwnProperty(I)?(v!=null&&I==="onScroll"&&we("scroll",t),h||_===v||(h=[])):(h=h||[]).push(I,v))}o&&(h=h||[]).push("style",o);var I=h;(i.updateQueue=I)&&(i.flags|=4)}},dp=function(t,i,o,a){o!==a&&(i.flags|=4)};function es(t,i){if(!Ee)switch(t.tailMode){case"hidden":i=t.tail;for(var o=null;i!==null;)i.alternate!==null&&(o=i),i=i.sibling;o===null?t.tail=null:o.sibling=null;break;case"collapsed":o=t.tail;for(var a=null;o!==null;)o.alternate!==null&&(a=o),o=o.sibling;a===null?i||t.tail===null?t.tail=null:t.tail.sibling=null:a.sibling=null}}function et(t){var i=t.alternate!==null&&t.alternate.child===t.child,o=0,a=0;if(i)for(var c=t.child;c!==null;)o|=c.lanes|c.childLanes,a|=c.subtreeFlags&14680064,a|=c.flags&14680064,c.return=t,c=c.sibling;else for(c=t.child;c!==null;)o|=c.lanes|c.childLanes,a|=c.subtreeFlags,a|=c.flags,c.return=t,c=c.sibling;return t.subtreeFlags|=a,t.childLanes=o,i}function o0(t,i,o){var a=i.pendingProps;switch(ja(i),i.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return et(i),null;case 1:return dt(i.type)&&po(),et(i),null;case 3:return a=i.stateNode,ti(),ke(ct),ke(Ze),eu(),a.pendingContext&&(a.context=a.pendingContext,a.pendingContext=null),(t===null||t.child===null)&&(vo(i)?i.flags|=4:t===null||t.memoizedState.isDehydrated&&(i.flags&256)===0||(i.flags|=1024,Ht!==null&&(Pu(Ht),Ht=null))),vu(t,i),et(i),null;case 5:Za(i);var c=cr(Gi.current);if(o=i.type,t!==null&&i.stateNode!=null)cp(t,i,o,a,c),t.ref!==i.ref&&(i.flags|=512,i.flags|=2097152);else{if(!a){if(i.stateNode===null)throw Error(r(166));return et(i),null}if(t=cr(tn.current),vo(i)){a=i.stateNode,o=i.type;var h=i.memoizedProps;switch(a[en]=i,a[Wi]=h,t=(i.mode&1)!==0,o){case"dialog":we("cancel",a),we("close",a);break;case"iframe":case"object":case"embed":we("load",a);break;case"video":case"audio":for(c=0;c<ji.length;c++)we(ji[c],a);break;case"source":we("error",a);break;case"img":case"image":case"link":we("error",a),we("load",a);break;case"details":we("toggle",a);break;case"input":Wd(a,h),we("invalid",a);break;case"select":a._wrapperState={wasMultiple:!!h.multiple},we("invalid",a);break;case"textarea":Kd(a,h),we("invalid",a)}Jl(o,h),c=null;for(var p in h)if(h.hasOwnProperty(p)){var _=h[p];p==="children"?typeof _=="string"?a.textContent!==_&&(h.suppressHydrationWarning!==!0&&co(a.textContent,_,t),c=["children",_]):typeof _=="number"&&a.textContent!==""+_&&(h.suppressHydrationWarning!==!0&&co(a.textContent,_,t),c=["children",""+_]):l.hasOwnProperty(p)&&_!=null&&p==="onScroll"&&we("scroll",a)}switch(o){case"input":js(a),qd(a,h,!0);break;case"textarea":js(a),Gd(a);break;case"select":case"option":break;default:typeof h.onClick=="function"&&(a.onclick=ho)}a=c,i.updateQueue=a,a!==null&&(i.flags|=4)}else{p=c.nodeType===9?c:c.ownerDocument,t==="http://www.w3.org/1999/xhtml"&&(t=Yd(o)),t==="http://www.w3.org/1999/xhtml"?o==="script"?(t=p.createElement("div"),t.innerHTML="<script><\/script>",t=t.removeChild(t.firstChild)):typeof a.is=="string"?t=p.createElement(o,{is:a.is}):(t=p.createElement(o),o==="select"&&(p=t,a.multiple?p.multiple=!0:a.size&&(p.size=a.size))):t=p.createElementNS(t,o),t[en]=i,t[Wi]=a,up(t,i,!1,!1),i.stateNode=t;e:{switch(p=ea(o,a),o){case"dialog":we("cancel",t),we("close",t),c=a;break;case"iframe":case"object":case"embed":we("load",t),c=a;break;case"video":case"audio":for(c=0;c<ji.length;c++)we(ji[c],t);c=a;break;case"source":we("error",t),c=a;break;case"img":case"image":case"link":we("error",t),we("load",t),c=a;break;case"details":we("toggle",t),c=a;break;case"input":Wd(t,a),c=Ql(t,a),we("invalid",t);break;case"option":c=a;break;case"select":t._wrapperState={wasMultiple:!!a.multiple},c=z({},a,{value:void 0}),we("invalid",t);break;case"textarea":Kd(t,a),c=Xl(t,a),we("invalid",t);break;default:c=a}Jl(o,c),_=c;for(h in _)if(_.hasOwnProperty(h)){var v=_[h];h==="style"?Jd(t,v):h==="dangerouslySetInnerHTML"?(v=v?v.__html:void 0,v!=null&&Xd(t,v)):h==="children"?typeof v=="string"?(o!=="textarea"||v!=="")&&Ci(t,v):typeof v=="number"&&Ci(t,""+v):h!=="suppressContentEditableWarning"&&h!=="suppressHydrationWarning"&&h!=="autoFocus"&&(l.hasOwnProperty(h)?v!=null&&h==="onScroll"&&we("scroll",t):v!=null&&ae(t,h,v,p))}switch(o){case"input":js(t),qd(t,a,!1);break;case"textarea":js(t),Gd(t);break;case"option":a.value!=null&&t.setAttribute("value",""+ce(a.value));break;case"select":t.multiple=!!a.multiple,h=a.value,h!=null?br(t,!!a.multiple,h,!1):a.defaultValue!=null&&br(t,!!a.multiple,a.defaultValue,!0);break;default:typeof c.onClick=="function"&&(t.onclick=ho)}switch(o){case"button":case"input":case"select":case"textarea":a=!!a.autoFocus;break e;case"img":a=!0;break e;default:a=!1}}a&&(i.flags|=4)}i.ref!==null&&(i.flags|=512,i.flags|=2097152)}return et(i),null;case 6:if(t&&i.stateNode!=null)dp(t,i,t.memoizedProps,a);else{if(typeof a!="string"&&i.stateNode===null)throw Error(r(166));if(o=cr(Gi.current),cr(tn.current),vo(i)){if(a=i.stateNode,o=i.memoizedProps,a[en]=i,(h=a.nodeValue!==o)&&(t=kt,t!==null))switch(t.tag){case 3:co(a.nodeValue,o,(t.mode&1)!==0);break;case 5:t.memoizedProps.suppressHydrationWarning!==!0&&co(a.nodeValue,o,(t.mode&1)!==0)}h&&(i.flags|=4)}else a=(o.nodeType===9?o:o.ownerDocument).createTextNode(a),a[en]=i,i.stateNode=a}return et(i),null;case 13:if(ke(Te),a=i.memoizedState,t===null||t.memoizedState!==null&&t.memoizedState.dehydrated!==null){if(Ee&&Ct!==null&&(i.mode&1)!==0&&(i.flags&128)===0)pf(),Xr(),i.flags|=98560,h=!1;else if(h=vo(i),a!==null&&a.dehydrated!==null){if(t===null){if(!h)throw Error(r(318));if(h=i.memoizedState,h=h!==null?h.dehydrated:null,!h)throw Error(r(317));h[en]=i}else Xr(),(i.flags&128)===0&&(i.memoizedState=null),i.flags|=4;et(i),h=!1}else Ht!==null&&(Pu(Ht),Ht=null),h=!0;if(!h)return i.flags&65536?i:null}return(i.flags&128)!==0?(i.lanes=o,i):(a=a!==null,a!==(t!==null&&t.memoizedState!==null)&&a&&(i.child.flags|=8192,(i.mode&1)!==0&&(t===null||(Te.current&1)!==0?Ue===0&&(Ue=3):Du())),i.updateQueue!==null&&(i.flags|=4),et(i),null);case 4:return ti(),vu(t,i),t===null&&Hi(i.stateNode.containerInfo),et(i),null;case 10:return Ka(i.type._context),et(i),null;case 17:return dt(i.type)&&po(),et(i),null;case 19:if(ke(Te),h=i.memoizedState,h===null)return et(i),null;if(a=(i.flags&128)!==0,p=h.rendering,p===null)if(a)es(h,!1);else{if(Ue!==0||t!==null&&(t.flags&128)!==0)for(t=i.child;t!==null;){if(p=To(t),p!==null){for(i.flags|=128,es(h,!1),a=p.updateQueue,a!==null&&(i.updateQueue=a,i.flags|=4),i.subtreeFlags=0,a=o,o=i.child;o!==null;)h=o,t=a,h.flags&=14680066,p=h.alternate,p===null?(h.childLanes=0,h.lanes=t,h.child=null,h.subtreeFlags=0,h.memoizedProps=null,h.memoizedState=null,h.updateQueue=null,h.dependencies=null,h.stateNode=null):(h.childLanes=p.childLanes,h.lanes=p.lanes,h.child=p.child,h.subtreeFlags=0,h.deletions=null,h.memoizedProps=p.memoizedProps,h.memoizedState=p.memoizedState,h.updateQueue=p.updateQueue,h.type=p.type,t=p.dependencies,h.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext}),o=o.sibling;return ge(Te,Te.current&1|2),i.child}t=t.sibling}h.tail!==null&&De()>si&&(i.flags|=128,a=!0,es(h,!1),i.lanes=4194304)}else{if(!a)if(t=To(p),t!==null){if(i.flags|=128,a=!0,o=t.updateQueue,o!==null&&(i.updateQueue=o,i.flags|=4),es(h,!0),h.tail===null&&h.tailMode==="hidden"&&!p.alternate&&!Ee)return et(i),null}else 2*De()-h.renderingStartTime>si&&o!==1073741824&&(i.flags|=128,a=!0,es(h,!1),i.lanes=4194304);h.isBackwards?(p.sibling=i.child,i.child=p):(o=h.last,o!==null?o.sibling=p:i.child=p,h.last=p)}return h.tail!==null?(i=h.tail,h.rendering=i,h.tail=i.sibling,h.renderingStartTime=De(),i.sibling=null,o=Te.current,ge(Te,a?o&1|2:o&1),i):(et(i),null);case 22:case 23:return Mu(),a=i.memoizedState!==null,t!==null&&t.memoizedState!==null!==a&&(i.flags|=8192),a&&(i.mode&1)!==0?(Et&1073741824)!==0&&(et(i),i.subtreeFlags&6&&(i.flags|=8192)):et(i),null;case 24:return null;case 25:return null}throw Error(r(156,i.tag))}function l0(t,i){switch(ja(i),i.tag){case 1:return dt(i.type)&&po(),t=i.flags,t&65536?(i.flags=t&-65537|128,i):null;case 3:return ti(),ke(ct),ke(Ze),eu(),t=i.flags,(t&65536)!==0&&(t&128)===0?(i.flags=t&-65537|128,i):null;case 5:return Za(i),null;case 13:if(ke(Te),t=i.memoizedState,t!==null&&t.dehydrated!==null){if(i.alternate===null)throw Error(r(340));Xr()}return t=i.flags,t&65536?(i.flags=t&-65537|128,i):null;case 19:return ke(Te),null;case 4:return ti(),null;case 10:return Ka(i.type._context),null;case 22:case 23:return Mu(),null;case 24:return null;default:return null}}var Oo=!1,tt=!1,a0=typeof WeakSet=="function"?WeakSet:Set,B=null;function ri(t,i){var o=t.ref;if(o!==null)if(typeof o=="function")try{o(null)}catch(a){Pe(t,i,a)}else o.current=null}function wu(t,i,o){try{o()}catch(a){Pe(t,i,a)}}var hp=!1;function u0(t,i){if(Ma=Js,t=Vh(),Sa(t)){if("selectionStart"in t)var o={start:t.selectionStart,end:t.selectionEnd};else e:{o=(o=t.ownerDocument)&&o.defaultView||window;var a=o.getSelection&&o.getSelection();if(a&&a.rangeCount!==0){o=a.anchorNode;var c=a.anchorOffset,h=a.focusNode;a=a.focusOffset;try{o.nodeType,h.nodeType}catch{o=null;break e}var p=0,_=-1,v=-1,I=0,R=0,M=t,x=null;t:for(;;){for(var F;M!==o||c!==0&&M.nodeType!==3||(_=p+c),M!==h||a!==0&&M.nodeType!==3||(v=p+a),M.nodeType===3&&(p+=M.nodeValue.length),(F=M.firstChild)!==null;)x=M,M=F;for(;;){if(M===t)break t;if(x===o&&++I===c&&(_=p),x===h&&++R===a&&(v=p),(F=M.nextSibling)!==null)break;M=x,x=M.parentNode}M=F}o=_===-1||v===-1?null:{start:_,end:v}}else o=null}o=o||{start:0,end:0}}else o=null;for(Da={focusedElem:t,selectionRange:o},Js=!1,B=i;B!==null;)if(i=B,t=i.child,(i.subtreeFlags&1028)!==0&&t!==null)t.return=i,B=t;else for(;B!==null;){i=B;try{var j=i.alternate;if((i.flags&1024)!==0)switch(i.tag){case 0:case 11:case 15:break;case 1:if(j!==null){var V=j.memoizedProps,Oe=j.memoizedState,S=i.stateNode,C=S.getSnapshotBeforeUpdate(i.elementType===i.type?V:Vt(i.type,V),Oe);S.__reactInternalSnapshotBeforeUpdate=C}break;case 3:var T=i.stateNode.containerInfo;T.nodeType===1?T.textContent="":T.nodeType===9&&T.documentElement&&T.removeChild(T.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(r(163))}}catch(O){Pe(i,i.return,O)}if(t=i.sibling,t!==null){t.return=i.return,B=t;break}B=i.return}return j=hp,hp=!1,j}function ts(t,i,o){var a=i.updateQueue;if(a=a!==null?a.lastEffect:null,a!==null){var c=a=a.next;do{if((c.tag&t)===t){var h=c.destroy;c.destroy=void 0,h!==void 0&&wu(i,o,h)}c=c.next}while(c!==a)}}function Lo(t,i){if(i=i.updateQueue,i=i!==null?i.lastEffect:null,i!==null){var o=i=i.next;do{if((o.tag&t)===t){var a=o.create;o.destroy=a()}o=o.next}while(o!==i)}}function ku(t){var i=t.ref;if(i!==null){var o=t.stateNode;switch(t.tag){case 5:t=o;break;default:t=o}typeof i=="function"?i(t):i.current=t}}function fp(t){var i=t.alternate;i!==null&&(t.alternate=null,fp(i)),t.child=null,t.deletions=null,t.sibling=null,t.tag===5&&(i=t.stateNode,i!==null&&(delete i[en],delete i[Wi],delete i[Fa],delete i[$1],delete i[q1])),t.stateNode=null,t.return=null,t.dependencies=null,t.memoizedProps=null,t.memoizedState=null,t.pendingProps=null,t.stateNode=null,t.updateQueue=null}function pp(t){return t.tag===5||t.tag===3||t.tag===4}function mp(t){e:for(;;){for(;t.sibling===null;){if(t.return===null||pp(t.return))return null;t=t.return}for(t.sibling.return=t.return,t=t.sibling;t.tag!==5&&t.tag!==6&&t.tag!==18;){if(t.flags&2||t.child===null||t.tag===4)continue e;t.child.return=t,t=t.child}if(!(t.flags&2))return t.stateNode}}function Cu(t,i,o){var a=t.tag;if(a===5||a===6)t=t.stateNode,i?o.nodeType===8?o.parentNode.insertBefore(t,i):o.insertBefore(t,i):(o.nodeType===8?(i=o.parentNode,i.insertBefore(t,o)):(i=o,i.appendChild(t)),o=o._reactRootContainer,o!=null||i.onclick!==null||(i.onclick=ho));else if(a!==4&&(t=t.child,t!==null))for(Cu(t,i,o),t=t.sibling;t!==null;)Cu(t,i,o),t=t.sibling}function Eu(t,i,o){var a=t.tag;if(a===5||a===6)t=t.stateNode,i?o.insertBefore(t,i):o.appendChild(t);else if(a!==4&&(t=t.child,t!==null))for(Eu(t,i,o),t=t.sibling;t!==null;)Eu(t,i,o),t=t.sibling}var Ke=null,Wt=!1;function Fn(t,i,o){for(o=o.child;o!==null;)gp(t,i,o),o=o.sibling}function gp(t,i,o){if(Jt&&typeof Jt.onCommitFiberUnmount=="function")try{Jt.onCommitFiberUnmount(Ks,o)}catch{}switch(o.tag){case 5:tt||ri(o,i);case 6:var a=Ke,c=Wt;Ke=null,Fn(t,i,o),Ke=a,Wt=c,Ke!==null&&(Wt?(t=Ke,o=o.stateNode,t.nodeType===8?t.parentNode.removeChild(o):t.removeChild(o)):Ke.removeChild(o.stateNode));break;case 18:Ke!==null&&(Wt?(t=Ke,o=o.stateNode,t.nodeType===8?ba(t.parentNode,o):t.nodeType===1&&ba(t,o),Di(t)):ba(Ke,o.stateNode));break;case 4:a=Ke,c=Wt,Ke=o.stateNode.containerInfo,Wt=!0,Fn(t,i,o),Ke=a,Wt=c;break;case 0:case 11:case 14:case 15:if(!tt&&(a=o.updateQueue,a!==null&&(a=a.lastEffect,a!==null))){c=a=a.next;do{var h=c,p=h.destroy;h=h.tag,p!==void 0&&((h&2)!==0||(h&4)!==0)&&wu(o,i,p),c=c.next}while(c!==a)}Fn(t,i,o);break;case 1:if(!tt&&(ri(o,i),a=o.stateNode,typeof a.componentWillUnmount=="function"))try{a.props=o.memoizedProps,a.state=o.memoizedState,a.componentWillUnmount()}catch(_){Pe(o,i,_)}Fn(t,i,o);break;case 21:Fn(t,i,o);break;case 22:o.mode&1?(tt=(a=tt)||o.memoizedState!==null,Fn(t,i,o),tt=a):Fn(t,i,o);break;default:Fn(t,i,o)}}function _p(t){var i=t.updateQueue;if(i!==null){t.updateQueue=null;var o=t.stateNode;o===null&&(o=t.stateNode=new a0),i.forEach(function(a){var c=y0.bind(null,t,a);o.has(a)||(o.add(a),a.then(c,c))})}}function $t(t,i){var o=i.deletions;if(o!==null)for(var a=0;a<o.length;a++){var c=o[a];try{var h=t,p=i,_=p;e:for(;_!==null;){switch(_.tag){case 5:Ke=_.stateNode,Wt=!1;break e;case 3:Ke=_.stateNode.containerInfo,Wt=!0;break e;case 4:Ke=_.stateNode.containerInfo,Wt=!0;break e}_=_.return}if(Ke===null)throw Error(r(160));gp(h,p,c),Ke=null,Wt=!1;var v=c.alternate;v!==null&&(v.return=null),c.return=null}catch(I){Pe(c,i,I)}}if(i.subtreeFlags&12854)for(i=i.child;i!==null;)yp(i,t),i=i.sibling}function yp(t,i){var o=t.alternate,a=t.flags;switch(t.tag){case 0:case 11:case 14:case 15:if($t(i,t),rn(t),a&4){try{ts(3,t,t.return),Lo(3,t)}catch(V){Pe(t,t.return,V)}try{ts(5,t,t.return)}catch(V){Pe(t,t.return,V)}}break;case 1:$t(i,t),rn(t),a&512&&o!==null&&ri(o,o.return);break;case 5:if($t(i,t),rn(t),a&512&&o!==null&&ri(o,o.return),t.flags&32){var c=t.stateNode;try{Ci(c,"")}catch(V){Pe(t,t.return,V)}}if(a&4&&(c=t.stateNode,c!=null)){var h=t.memoizedProps,p=o!==null?o.memoizedProps:h,_=t.type,v=t.updateQueue;if(t.updateQueue=null,v!==null)try{_==="input"&&h.type==="radio"&&h.name!=null&&$d(c,h),ea(_,p);var I=ea(_,h);for(p=0;p<v.length;p+=2){var R=v[p],M=v[p+1];R==="style"?Jd(c,M):R==="dangerouslySetInnerHTML"?Xd(c,M):R==="children"?Ci(c,M):ae(c,R,M,I)}switch(_){case"input":Gl(c,h);break;case"textarea":Qd(c,h);break;case"select":var x=c._wrapperState.wasMultiple;c._wrapperState.wasMultiple=!!h.multiple;var F=h.value;F!=null?br(c,!!h.multiple,F,!1):x!==!!h.multiple&&(h.defaultValue!=null?br(c,!!h.multiple,h.defaultValue,!0):br(c,!!h.multiple,h.multiple?[]:"",!1))}c[Wi]=h}catch(V){Pe(t,t.return,V)}}break;case 6:if($t(i,t),rn(t),a&4){if(t.stateNode===null)throw Error(r(162));c=t.stateNode,h=t.memoizedProps;try{c.nodeValue=h}catch(V){Pe(t,t.return,V)}}break;case 3:if($t(i,t),rn(t),a&4&&o!==null&&o.memoizedState.isDehydrated)try{Di(i.containerInfo)}catch(V){Pe(t,t.return,V)}break;case 4:$t(i,t),rn(t);break;case 13:$t(i,t),rn(t),c=t.child,c.flags&8192&&(h=c.memoizedState!==null,c.stateNode.isHidden=h,!h||c.alternate!==null&&c.alternate.memoizedState!==null||(Iu=De())),a&4&&_p(t);break;case 22:if(R=o!==null&&o.memoizedState!==null,t.mode&1?(tt=(I=tt)||R,$t(i,t),tt=I):$t(i,t),rn(t),a&8192){if(I=t.memoizedState!==null,(t.stateNode.isHidden=I)&&!R&&(t.mode&1)!==0)for(B=t,R=t.child;R!==null;){for(M=B=R;B!==null;){switch(x=B,F=x.child,x.tag){case 0:case 11:case 14:case 15:ts(4,x,x.return);break;case 1:ri(x,x.return);var j=x.stateNode;if(typeof j.componentWillUnmount=="function"){a=x,o=x.return;try{i=a,j.props=i.memoizedProps,j.state=i.memoizedState,j.componentWillUnmount()}catch(V){Pe(a,o,V)}}break;case 5:ri(x,x.return);break;case 22:if(x.memoizedState!==null){kp(M);continue}}F!==null?(F.return=x,B=F):kp(M)}R=R.sibling}e:for(R=null,M=t;;){if(M.tag===5){if(R===null){R=M;try{c=M.stateNode,I?(h=c.style,typeof h.setProperty=="function"?h.setProperty("display","none","important"):h.display="none"):(_=M.stateNode,v=M.memoizedProps.style,p=v!=null&&v.hasOwnProperty("display")?v.display:null,_.style.display=Zd("display",p))}catch(V){Pe(t,t.return,V)}}}else if(M.tag===6){if(R===null)try{M.stateNode.nodeValue=I?"":M.memoizedProps}catch(V){Pe(t,t.return,V)}}else if((M.tag!==22&&M.tag!==23||M.memoizedState===null||M===t)&&M.child!==null){M.child.return=M,M=M.child;continue}if(M===t)break e;for(;M.sibling===null;){if(M.return===null||M.return===t)break e;R===M&&(R=null),M=M.return}R===M&&(R=null),M.sibling.return=M.return,M=M.sibling}}break;case 19:$t(i,t),rn(t),a&4&&_p(t);break;case 21:break;default:$t(i,t),rn(t)}}function rn(t){var i=t.flags;if(i&2){try{e:{for(var o=t.return;o!==null;){if(pp(o)){var a=o;break e}o=o.return}throw Error(r(160))}switch(a.tag){case 5:var c=a.stateNode;a.flags&32&&(Ci(c,""),a.flags&=-33);var h=mp(t);Eu(t,h,c);break;case 3:case 4:var p=a.stateNode.containerInfo,_=mp(t);Cu(t,_,p);break;default:throw Error(r(161))}}catch(v){Pe(t,t.return,v)}t.flags&=-3}i&4096&&(t.flags&=-4097)}function c0(t,i,o){B=t,vp(t)}function vp(t,i,o){for(var a=(t.mode&1)!==0;B!==null;){var c=B,h=c.child;if(c.tag===22&&a){var p=c.memoizedState!==null||Oo;if(!p){var _=c.alternate,v=_!==null&&_.memoizedState!==null||tt;_=Oo;var I=tt;if(Oo=p,(tt=v)&&!I)for(B=c;B!==null;)p=B,v=p.child,p.tag===22&&p.memoizedState!==null?Cp(c):v!==null?(v.return=p,B=v):Cp(c);for(;h!==null;)B=h,vp(h),h=h.sibling;B=c,Oo=_,tt=I}wp(t)}else(c.subtreeFlags&8772)!==0&&h!==null?(h.return=c,B=h):wp(t)}}function wp(t){for(;B!==null;){var i=B;if((i.flags&8772)!==0){var o=i.alternate;try{if((i.flags&8772)!==0)switch(i.tag){case 0:case 11:case 15:tt||Lo(5,i);break;case 1:var a=i.stateNode;if(i.flags&4&&!tt)if(o===null)a.componentDidMount();else{var c=i.elementType===i.type?o.memoizedProps:Vt(i.type,o.memoizedProps);a.componentDidUpdate(c,o.memoizedState,a.__reactInternalSnapshotBeforeUpdate)}var h=i.updateQueue;h!==null&&kf(i,h,a);break;case 3:var p=i.updateQueue;if(p!==null){if(o=null,i.child!==null)switch(i.child.tag){case 5:o=i.child.stateNode;break;case 1:o=i.child.stateNode}kf(i,p,o)}break;case 5:var _=i.stateNode;if(o===null&&i.flags&4){o=_;var v=i.memoizedProps;switch(i.type){case"button":case"input":case"select":case"textarea":v.autoFocus&&o.focus();break;case"img":v.src&&(o.src=v.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(i.memoizedState===null){var I=i.alternate;if(I!==null){var R=I.memoizedState;if(R!==null){var M=R.dehydrated;M!==null&&Di(M)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(r(163))}tt||i.flags&512&&ku(i)}catch(x){Pe(i,i.return,x)}}if(i===t){B=null;break}if(o=i.sibling,o!==null){o.return=i.return,B=o;break}B=i.return}}function kp(t){for(;B!==null;){var i=B;if(i===t){B=null;break}var o=i.sibling;if(o!==null){o.return=i.return,B=o;break}B=i.return}}function Cp(t){for(;B!==null;){var i=B;try{switch(i.tag){case 0:case 11:case 15:var o=i.return;try{Lo(4,i)}catch(v){Pe(i,o,v)}break;case 1:var a=i.stateNode;if(typeof a.componentDidMount=="function"){var c=i.return;try{a.componentDidMount()}catch(v){Pe(i,c,v)}}var h=i.return;try{ku(i)}catch(v){Pe(i,h,v)}break;case 5:var p=i.return;try{ku(i)}catch(v){Pe(i,p,v)}}}catch(v){Pe(i,i.return,v)}if(i===t){B=null;break}var _=i.sibling;if(_!==null){_.return=i.return,B=_;break}B=i.return}}var d0=Math.ceil,bo=ne.ReactCurrentDispatcher,Su=ne.ReactCurrentOwner,Pt=ne.ReactCurrentBatchConfig,re=0,je=null,Le=null,Qe=0,Et=0,ii=Mn(0),Ue=0,ns=null,hr=0,Fo=0,Tu=0,rs=null,ft=null,Iu=0,si=1/0,_n=null,Uo=!1,xu=null,Un=null,Bo=!1,Bn=null,zo=0,is=0,Nu=null,jo=-1,Ho=0;function st(){return(re&6)!==0?De():jo!==-1?jo:jo=De()}function zn(t){return(t.mode&1)===0?1:(re&2)!==0&&Qe!==0?Qe&-Qe:Q1.transition!==null?(Ho===0&&(Ho=ph()),Ho):(t=de,t!==0||(t=window.event,t=t===void 0?16:Eh(t.type)),t)}function qt(t,i,o,a){if(50<is)throw is=0,Nu=null,Error(r(185));Ni(t,o,a),((re&2)===0||t!==je)&&(t===je&&((re&2)===0&&(Fo|=o),Ue===4&&jn(t,Qe)),pt(t,a),o===1&&re===0&&(i.mode&1)===0&&(si=De()+500,go&&On()))}function pt(t,i){var o=t.callbackNode;Qy(t,i);var a=Ys(t,t===je?Qe:0);if(a===0)o!==null&&dh(o),t.callbackNode=null,t.callbackPriority=0;else if(i=a&-a,t.callbackPriority!==i){if(o!=null&&dh(o),i===1)t.tag===0?K1(Sp.bind(null,t)):uf(Sp.bind(null,t)),V1(function(){(re&6)===0&&On()}),o=null;else{switch(mh(a)){case 1:o=la;break;case 4:o=hh;break;case 16:o=qs;break;case 536870912:o=fh;break;default:o=qs}o=Mp(o,Ep.bind(null,t))}t.callbackPriority=i,t.callbackNode=o}}function Ep(t,i){if(jo=-1,Ho=0,(re&6)!==0)throw Error(r(327));var o=t.callbackNode;if(oi()&&t.callbackNode!==o)return null;var a=Ys(t,t===je?Qe:0);if(a===0)return null;if((a&30)!==0||(a&t.expiredLanes)!==0||i)i=Vo(t,a);else{i=a;var c=re;re|=2;var h=Ip();(je!==t||Qe!==i)&&(_n=null,si=De()+500,pr(t,i));do try{p0();break}catch(_){Tp(t,_)}while(!0);qa(),bo.current=h,re=c,Le!==null?i=0:(je=null,Qe=0,i=Ue)}if(i!==0){if(i===2&&(c=aa(t),c!==0&&(a=c,i=Ru(t,c))),i===1)throw o=ns,pr(t,0),jn(t,a),pt(t,De()),o;if(i===6)jn(t,a);else{if(c=t.current.alternate,(a&30)===0&&!h0(c)&&(i=Vo(t,a),i===2&&(h=aa(t),h!==0&&(a=h,i=Ru(t,h))),i===1))throw o=ns,pr(t,0),jn(t,a),pt(t,De()),o;switch(t.finishedWork=c,t.finishedLanes=a,i){case 0:case 1:throw Error(r(345));case 2:mr(t,ft,_n);break;case 3:if(jn(t,a),(a&130023424)===a&&(i=Iu+500-De(),10<i)){if(Ys(t,0)!==0)break;if(c=t.suspendedLanes,(c&a)!==a){st(),t.pingedLanes|=t.suspendedLanes&c;break}t.timeoutHandle=La(mr.bind(null,t,ft,_n),i);break}mr(t,ft,_n);break;case 4:if(jn(t,a),(a&4194240)===a)break;for(i=t.eventTimes,c=-1;0<a;){var p=31-zt(a);h=1<<p,p=i[p],p>c&&(c=p),a&=~h}if(a=c,a=De()-a,a=(120>a?120:480>a?480:1080>a?1080:1920>a?1920:3e3>a?3e3:4320>a?4320:1960*d0(a/1960))-a,10<a){t.timeoutHandle=La(mr.bind(null,t,ft,_n),a);break}mr(t,ft,_n);break;case 5:mr(t,ft,_n);break;default:throw Error(r(329))}}}return pt(t,De()),t.callbackNode===o?Ep.bind(null,t):null}function Ru(t,i){var o=rs;return t.current.memoizedState.isDehydrated&&(pr(t,i).flags|=256),t=Vo(t,i),t!==2&&(i=ft,ft=o,i!==null&&Pu(i)),t}function Pu(t){ft===null?ft=t:ft.push.apply(ft,t)}function h0(t){for(var i=t;;){if(i.flags&16384){var o=i.updateQueue;if(o!==null&&(o=o.stores,o!==null))for(var a=0;a<o.length;a++){var c=o[a],h=c.getSnapshot;c=c.value;try{if(!jt(h(),c))return!1}catch{return!1}}}if(o=i.child,i.subtreeFlags&16384&&o!==null)o.return=i,i=o;else{if(i===t)break;for(;i.sibling===null;){if(i.return===null||i.return===t)return!0;i=i.return}i.sibling.return=i.return,i=i.sibling}}return!0}function jn(t,i){for(i&=~Tu,i&=~Fo,t.suspendedLanes|=i,t.pingedLanes&=~i,t=t.expirationTimes;0<i;){var o=31-zt(i),a=1<<o;t[o]=-1,i&=~a}}function Sp(t){if((re&6)!==0)throw Error(r(327));oi();var i=Ys(t,0);if((i&1)===0)return pt(t,De()),null;var o=Vo(t,i);if(t.tag!==0&&o===2){var a=aa(t);a!==0&&(i=a,o=Ru(t,a))}if(o===1)throw o=ns,pr(t,0),jn(t,i),pt(t,De()),o;if(o===6)throw Error(r(345));return t.finishedWork=t.current.alternate,t.finishedLanes=i,mr(t,ft,_n),pt(t,De()),null}function Au(t,i){var o=re;re|=1;try{return t(i)}finally{re=o,re===0&&(si=De()+500,go&&On())}}function fr(t){Bn!==null&&Bn.tag===0&&(re&6)===0&&oi();var i=re;re|=1;var o=Pt.transition,a=de;try{if(Pt.transition=null,de=1,t)return t()}finally{de=a,Pt.transition=o,re=i,(re&6)===0&&On()}}function Mu(){Et=ii.current,ke(ii)}function pr(t,i){t.finishedWork=null,t.finishedLanes=0;var o=t.timeoutHandle;if(o!==-1&&(t.timeoutHandle=-1,H1(o)),Le!==null)for(o=Le.return;o!==null;){var a=o;switch(ja(a),a.tag){case 1:a=a.type.childContextTypes,a!=null&&po();break;case 3:ti(),ke(ct),ke(Ze),eu();break;case 5:Za(a);break;case 4:ti();break;case 13:ke(Te);break;case 19:ke(Te);break;case 10:Ka(a.type._context);break;case 22:case 23:Mu()}o=o.return}if(je=t,Le=t=Hn(t.current,null),Qe=Et=i,Ue=0,ns=null,Tu=Fo=hr=0,ft=rs=null,ur!==null){for(i=0;i<ur.length;i++)if(o=ur[i],a=o.interleaved,a!==null){o.interleaved=null;var c=a.next,h=o.pending;if(h!==null){var p=h.next;h.next=c,a.next=p}o.pending=a}ur=null}return t}function Tp(t,i){do{var o=Le;try{if(qa(),Io.current=Po,xo){for(var a=Ie.memoizedState;a!==null;){var c=a.queue;c!==null&&(c.pending=null),a=a.next}xo=!1}if(dr=0,ze=Fe=Ie=null,Yi=!1,Xi=0,Su.current=null,o===null||o.return===null){Ue=1,ns=i,Le=null;break}e:{var h=t,p=o.return,_=o,v=i;if(i=Qe,_.flags|=32768,v!==null&&typeof v=="object"&&typeof v.then=="function"){var I=v,R=_,M=R.tag;if((R.mode&1)===0&&(M===0||M===11||M===15)){var x=R.alternate;x?(R.updateQueue=x.updateQueue,R.memoizedState=x.memoizedState,R.lanes=x.lanes):(R.updateQueue=null,R.memoizedState=null)}var F=Yf(p);if(F!==null){F.flags&=-257,Xf(F,p,_,h,i),F.mode&1&&Gf(h,I,i),i=F,v=I;var j=i.updateQueue;if(j===null){var V=new Set;V.add(v),i.updateQueue=V}else j.add(v);break e}else{if((i&1)===0){Gf(h,I,i),Du();break e}v=Error(r(426))}}else if(Ee&&_.mode&1){var Oe=Yf(p);if(Oe!==null){(Oe.flags&65536)===0&&(Oe.flags|=256),Xf(Oe,p,_,h,i),Wa(ni(v,_));break e}}h=v=ni(v,_),Ue!==4&&(Ue=2),rs===null?rs=[h]:rs.push(h),h=p;do{switch(h.tag){case 3:h.flags|=65536,i&=-i,h.lanes|=i;var S=Kf(h,v,i);wf(h,S);break e;case 1:_=v;var C=h.type,T=h.stateNode;if((h.flags&128)===0&&(typeof C.getDerivedStateFromError=="function"||T!==null&&typeof T.componentDidCatch=="function"&&(Un===null||!Un.has(T)))){h.flags|=65536,i&=-i,h.lanes|=i;var O=Qf(h,_,i);wf(h,O);break e}}h=h.return}while(h!==null)}Np(o)}catch(W){i=W,Le===o&&o!==null&&(Le=o=o.return);continue}break}while(!0)}function Ip(){var t=bo.current;return bo.current=Po,t===null?Po:t}function Du(){(Ue===0||Ue===3||Ue===2)&&(Ue=4),je===null||(hr&268435455)===0&&(Fo&268435455)===0||jn(je,Qe)}function Vo(t,i){var o=re;re|=2;var a=Ip();(je!==t||Qe!==i)&&(_n=null,pr(t,i));do try{f0();break}catch(c){Tp(t,c)}while(!0);if(qa(),re=o,bo.current=a,Le!==null)throw Error(r(261));return je=null,Qe=0,Ue}function f0(){for(;Le!==null;)xp(Le)}function p0(){for(;Le!==null&&!By();)xp(Le)}function xp(t){var i=Ap(t.alternate,t,Et);t.memoizedProps=t.pendingProps,i===null?Np(t):Le=i,Su.current=null}function Np(t){var i=t;do{var o=i.alternate;if(t=i.return,(i.flags&32768)===0){if(o=o0(o,i,Et),o!==null){Le=o;return}}else{if(o=l0(o,i),o!==null){o.flags&=32767,Le=o;return}if(t!==null)t.flags|=32768,t.subtreeFlags=0,t.deletions=null;else{Ue=6,Le=null;return}}if(i=i.sibling,i!==null){Le=i;return}Le=i=t}while(i!==null);Ue===0&&(Ue=5)}function mr(t,i,o){var a=de,c=Pt.transition;try{Pt.transition=null,de=1,m0(t,i,o,a)}finally{Pt.transition=c,de=a}return null}function m0(t,i,o,a){do oi();while(Bn!==null);if((re&6)!==0)throw Error(r(327));o=t.finishedWork;var c=t.finishedLanes;if(o===null)return null;if(t.finishedWork=null,t.finishedLanes=0,o===t.current)throw Error(r(177));t.callbackNode=null,t.callbackPriority=0;var h=o.lanes|o.childLanes;if(Gy(t,h),t===je&&(Le=je=null,Qe=0),(o.subtreeFlags&2064)===0&&(o.flags&2064)===0||Bo||(Bo=!0,Mp(qs,function(){return oi(),null})),h=(o.flags&15990)!==0,(o.subtreeFlags&15990)!==0||h){h=Pt.transition,Pt.transition=null;var p=de;de=1;var _=re;re|=4,Su.current=null,u0(t,o),yp(o,t),L1(Da),Js=!!Ma,Da=Ma=null,t.current=o,c0(o),zy(),re=_,de=p,Pt.transition=h}else t.current=o;if(Bo&&(Bo=!1,Bn=t,zo=c),h=t.pendingLanes,h===0&&(Un=null),Vy(o.stateNode),pt(t,De()),i!==null)for(a=t.onRecoverableError,o=0;o<i.length;o++)c=i[o],a(c.value,{componentStack:c.stack,digest:c.digest});if(Uo)throw Uo=!1,t=xu,xu=null,t;return(zo&1)!==0&&t.tag!==0&&oi(),h=t.pendingLanes,(h&1)!==0?t===Nu?is++:(is=0,Nu=t):is=0,On(),null}function oi(){if(Bn!==null){var t=mh(zo),i=Pt.transition,o=de;try{if(Pt.transition=null,de=16>t?16:t,Bn===null)var a=!1;else{if(t=Bn,Bn=null,zo=0,(re&6)!==0)throw Error(r(331));var c=re;for(re|=4,B=t.current;B!==null;){var h=B,p=h.child;if((B.flags&16)!==0){var _=h.deletions;if(_!==null){for(var v=0;v<_.length;v++){var I=_[v];for(B=I;B!==null;){var R=B;switch(R.tag){case 0:case 11:case 15:ts(8,R,h)}var M=R.child;if(M!==null)M.return=R,B=M;else for(;B!==null;){R=B;var x=R.sibling,F=R.return;if(fp(R),R===I){B=null;break}if(x!==null){x.return=F,B=x;break}B=F}}}var j=h.alternate;if(j!==null){var V=j.child;if(V!==null){j.child=null;do{var Oe=V.sibling;V.sibling=null,V=Oe}while(V!==null)}}B=h}}if((h.subtreeFlags&2064)!==0&&p!==null)p.return=h,B=p;else e:for(;B!==null;){if(h=B,(h.flags&2048)!==0)switch(h.tag){case 0:case 11:case 15:ts(9,h,h.return)}var S=h.sibling;if(S!==null){S.return=h.return,B=S;break e}B=h.return}}var C=t.current;for(B=C;B!==null;){p=B;var T=p.child;if((p.subtreeFlags&2064)!==0&&T!==null)T.return=p,B=T;else e:for(p=C;B!==null;){if(_=B,(_.flags&2048)!==0)try{switch(_.tag){case 0:case 11:case 15:Lo(9,_)}}catch(W){Pe(_,_.return,W)}if(_===p){B=null;break e}var O=_.sibling;if(O!==null){O.return=_.return,B=O;break e}B=_.return}}if(re=c,On(),Jt&&typeof Jt.onPostCommitFiberRoot=="function")try{Jt.onPostCommitFiberRoot(Ks,t)}catch{}a=!0}return a}finally{de=o,Pt.transition=i}}return!1}function Rp(t,i,o){i=ni(o,i),i=Kf(t,i,1),t=bn(t,i,1),i=st(),t!==null&&(Ni(t,1,i),pt(t,i))}function Pe(t,i,o){if(t.tag===3)Rp(t,t,o);else for(;i!==null;){if(i.tag===3){Rp(i,t,o);break}else if(i.tag===1){var a=i.stateNode;if(typeof i.type.getDerivedStateFromError=="function"||typeof a.componentDidCatch=="function"&&(Un===null||!Un.has(a))){t=ni(o,t),t=Qf(i,t,1),i=bn(i,t,1),t=st(),i!==null&&(Ni(i,1,t),pt(i,t));break}}i=i.return}}function g0(t,i,o){var a=t.pingCache;a!==null&&a.delete(i),i=st(),t.pingedLanes|=t.suspendedLanes&o,je===t&&(Qe&o)===o&&(Ue===4||Ue===3&&(Qe&130023424)===Qe&&500>De()-Iu?pr(t,0):Tu|=o),pt(t,i)}function Pp(t,i){i===0&&((t.mode&1)===0?i=1:(i=Gs,Gs<<=1,(Gs&130023424)===0&&(Gs=4194304)));var o=st();t=pn(t,i),t!==null&&(Ni(t,i,o),pt(t,o))}function _0(t){var i=t.memoizedState,o=0;i!==null&&(o=i.retryLane),Pp(t,o)}function y0(t,i){var o=0;switch(t.tag){case 13:var a=t.stateNode,c=t.memoizedState;c!==null&&(o=c.retryLane);break;case 19:a=t.stateNode;break;default:throw Error(r(314))}a!==null&&a.delete(i),Pp(t,o)}var Ap;Ap=function(t,i,o){if(t!==null)if(t.memoizedProps!==i.pendingProps||ct.current)ht=!0;else{if((t.lanes&o)===0&&(i.flags&128)===0)return ht=!1,s0(t,i,o);ht=(t.flags&131072)!==0}else ht=!1,Ee&&(i.flags&1048576)!==0&&cf(i,yo,i.index);switch(i.lanes=0,i.tag){case 2:var a=i.type;Do(t,i),t=i.pendingProps;var c=Qr(i,Ze.current);ei(i,o),c=ru(null,i,a,t,c,o);var h=iu();return i.flags|=1,typeof c=="object"&&c!==null&&typeof c.render=="function"&&c.$$typeof===void 0?(i.tag=1,i.memoizedState=null,i.updateQueue=null,dt(a)?(h=!0,mo(i)):h=!1,i.memoizedState=c.state!==null&&c.state!==void 0?c.state:null,Ya(i),c.updater=Ao,i.stateNode=c,c._reactInternals=i,cu(i,a,t,o),i=pu(null,i,a,!0,h,o)):(i.tag=0,Ee&&h&&za(i),it(null,i,c,o),i=i.child),i;case 16:a=i.elementType;e:{switch(Do(t,i),t=i.pendingProps,c=a._init,a=c(a._payload),i.type=a,c=i.tag=w0(a),t=Vt(a,t),c){case 0:i=fu(null,i,a,t,o);break e;case 1:i=rp(null,i,a,t,o);break e;case 11:i=Zf(null,i,a,t,o);break e;case 14:i=Jf(null,i,a,Vt(a.type,t),o);break e}throw Error(r(306,a,""))}return i;case 0:return a=i.type,c=i.pendingProps,c=i.elementType===a?c:Vt(a,c),fu(t,i,a,c,o);case 1:return a=i.type,c=i.pendingProps,c=i.elementType===a?c:Vt(a,c),rp(t,i,a,c,o);case 3:e:{if(ip(i),t===null)throw Error(r(387));a=i.pendingProps,h=i.memoizedState,c=h.element,vf(t,i),So(i,a,null,o);var p=i.memoizedState;if(a=p.element,h.isDehydrated)if(h={element:a,isDehydrated:!1,cache:p.cache,pendingSuspenseBoundaries:p.pendingSuspenseBoundaries,transitions:p.transitions},i.updateQueue.baseState=h,i.memoizedState=h,i.flags&256){c=ni(Error(r(423)),i),i=sp(t,i,a,o,c);break e}else if(a!==c){c=ni(Error(r(424)),i),i=sp(t,i,a,o,c);break e}else for(Ct=An(i.stateNode.containerInfo.firstChild),kt=i,Ee=!0,Ht=null,o=_f(i,null,a,o),i.child=o;o;)o.flags=o.flags&-3|4096,o=o.sibling;else{if(Xr(),a===c){i=gn(t,i,o);break e}it(t,i,a,o)}i=i.child}return i;case 5:return Cf(i),t===null&&Va(i),a=i.type,c=i.pendingProps,h=t!==null?t.memoizedProps:null,p=c.children,Oa(a,c)?p=null:h!==null&&Oa(a,h)&&(i.flags|=32),np(t,i),it(t,i,p,o),i.child;case 6:return t===null&&Va(i),null;case 13:return op(t,i,o);case 4:return Xa(i,i.stateNode.containerInfo),a=i.pendingProps,t===null?i.child=Zr(i,null,a,o):it(t,i,a,o),i.child;case 11:return a=i.type,c=i.pendingProps,c=i.elementType===a?c:Vt(a,c),Zf(t,i,a,c,o);case 7:return it(t,i,i.pendingProps,o),i.child;case 8:return it(t,i,i.pendingProps.children,o),i.child;case 12:return it(t,i,i.pendingProps.children,o),i.child;case 10:e:{if(a=i.type._context,c=i.pendingProps,h=i.memoizedProps,p=c.value,ge(ko,a._currentValue),a._currentValue=p,h!==null)if(jt(h.value,p)){if(h.children===c.children&&!ct.current){i=gn(t,i,o);break e}}else for(h=i.child,h!==null&&(h.return=i);h!==null;){var _=h.dependencies;if(_!==null){p=h.child;for(var v=_.firstContext;v!==null;){if(v.context===a){if(h.tag===1){v=mn(-1,o&-o),v.tag=2;var I=h.updateQueue;if(I!==null){I=I.shared;var R=I.pending;R===null?v.next=v:(v.next=R.next,R.next=v),I.pending=v}}h.lanes|=o,v=h.alternate,v!==null&&(v.lanes|=o),Qa(h.return,o,i),_.lanes|=o;break}v=v.next}}else if(h.tag===10)p=h.type===i.type?null:h.child;else if(h.tag===18){if(p=h.return,p===null)throw Error(r(341));p.lanes|=o,_=p.alternate,_!==null&&(_.lanes|=o),Qa(p,o,i),p=h.sibling}else p=h.child;if(p!==null)p.return=h;else for(p=h;p!==null;){if(p===i){p=null;break}if(h=p.sibling,h!==null){h.return=p.return,p=h;break}p=p.return}h=p}it(t,i,c.children,o),i=i.child}return i;case 9:return c=i.type,a=i.pendingProps.children,ei(i,o),c=Nt(c),a=a(c),i.flags|=1,it(t,i,a,o),i.child;case 14:return a=i.type,c=Vt(a,i.pendingProps),c=Vt(a.type,c),Jf(t,i,a,c,o);case 15:return ep(t,i,i.type,i.pendingProps,o);case 17:return a=i.type,c=i.pendingProps,c=i.elementType===a?c:Vt(a,c),Do(t,i),i.tag=1,dt(a)?(t=!0,mo(i)):t=!1,ei(i,o),$f(i,a,c),cu(i,a,c,o),pu(null,i,a,!0,t,o);case 19:return ap(t,i,o);case 22:return tp(t,i,o)}throw Error(r(156,i.tag))};function Mp(t,i){return ch(t,i)}function v0(t,i,o,a){this.tag=t,this.key=o,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=i,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=a,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function At(t,i,o,a){return new v0(t,i,o,a)}function Ou(t){return t=t.prototype,!(!t||!t.isReactComponent)}function w0(t){if(typeof t=="function")return Ou(t)?1:0;if(t!=null){if(t=t.$$typeof,t===Xt)return 11;if(t===Zt)return 14}return 2}function Hn(t,i){var o=t.alternate;return o===null?(o=At(t.tag,i,t.key,t.mode),o.elementType=t.elementType,o.type=t.type,o.stateNode=t.stateNode,o.alternate=t,t.alternate=o):(o.pendingProps=i,o.type=t.type,o.flags=0,o.subtreeFlags=0,o.deletions=null),o.flags=t.flags&14680064,o.childLanes=t.childLanes,o.lanes=t.lanes,o.child=t.child,o.memoizedProps=t.memoizedProps,o.memoizedState=t.memoizedState,o.updateQueue=t.updateQueue,i=t.dependencies,o.dependencies=i===null?null:{lanes:i.lanes,firstContext:i.firstContext},o.sibling=t.sibling,o.index=t.index,o.ref=t.ref,o}function Wo(t,i,o,a,c,h){var p=2;if(a=t,typeof t=="function")Ou(t)&&(p=1);else if(typeof t=="string")p=5;else e:switch(t){case Ye:return gr(o.children,c,h,i);case Xe:p=8,c|=8;break;case Sn:return t=At(12,o,i,c|2),t.elementType=Sn,t.lanes=h,t;case yt:return t=At(13,o,i,c),t.elementType=yt,t.lanes=h,t;case Bt:return t=At(19,o,i,c),t.elementType=Bt,t.lanes=h,t;case Re:return $o(o,c,h,i);default:if(typeof t=="object"&&t!==null)switch(t.$$typeof){case un:p=10;break e;case rr:p=9;break e;case Xt:p=11;break e;case Zt:p=14;break e;case ut:p=16,a=null;break e}throw Error(r(130,t==null?t:typeof t,""))}return i=At(p,o,i,c),i.elementType=t,i.type=a,i.lanes=h,i}function gr(t,i,o,a){return t=At(7,t,a,i),t.lanes=o,t}function $o(t,i,o,a){return t=At(22,t,a,i),t.elementType=Re,t.lanes=o,t.stateNode={isHidden:!1},t}function Lu(t,i,o){return t=At(6,t,null,i),t.lanes=o,t}function bu(t,i,o){return i=At(4,t.children!==null?t.children:[],t.key,i),i.lanes=o,i.stateNode={containerInfo:t.containerInfo,pendingChildren:null,implementation:t.implementation},i}function k0(t,i,o,a,c){this.tag=i,this.containerInfo=t,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=ua(0),this.expirationTimes=ua(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=ua(0),this.identifierPrefix=a,this.onRecoverableError=c,this.mutableSourceEagerHydrationData=null}function Fu(t,i,o,a,c,h,p,_,v){return t=new k0(t,i,o,_,v),i===1?(i=1,h===!0&&(i|=8)):i=0,h=At(3,null,null,i),t.current=h,h.stateNode=t,h.memoizedState={element:a,isDehydrated:o,cache:null,transitions:null,pendingSuspenseBoundaries:null},Ya(h),t}function C0(t,i,o){var a=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:be,key:a==null?null:""+a,children:t,containerInfo:i,implementation:o}}function Dp(t){if(!t)return Dn;t=t._reactInternals;e:{if(ir(t)!==t||t.tag!==1)throw Error(r(170));var i=t;do{switch(i.tag){case 3:i=i.stateNode.context;break e;case 1:if(dt(i.type)){i=i.stateNode.__reactInternalMemoizedMergedChildContext;break e}}i=i.return}while(i!==null);throw Error(r(171))}if(t.tag===1){var o=t.type;if(dt(o))return lf(t,o,i)}return i}function Op(t,i,o,a,c,h,p,_,v){return t=Fu(o,a,!0,t,c,h,p,_,v),t.context=Dp(null),o=t.current,a=st(),c=zn(o),h=mn(a,c),h.callback=i??null,bn(o,h,c),t.current.lanes=c,Ni(t,c,a),pt(t,a),t}function qo(t,i,o,a){var c=i.current,h=st(),p=zn(c);return o=Dp(o),i.context===null?i.context=o:i.pendingContext=o,i=mn(h,p),i.payload={element:t},a=a===void 0?null:a,a!==null&&(i.callback=a),t=bn(c,i,p),t!==null&&(qt(t,c,p,h),Eo(t,c,p)),p}function Ko(t){if(t=t.current,!t.child)return null;switch(t.child.tag){case 5:return t.child.stateNode;default:return t.child.stateNode}}function Lp(t,i){if(t=t.memoizedState,t!==null&&t.dehydrated!==null){var o=t.retryLane;t.retryLane=o!==0&&o<i?o:i}}function Uu(t,i){Lp(t,i),(t=t.alternate)&&Lp(t,i)}function E0(){return null}var bp=typeof reportError=="function"?reportError:function(t){console.error(t)};function Bu(t){this._internalRoot=t}Qo.prototype.render=Bu.prototype.render=function(t){var i=this._internalRoot;if(i===null)throw Error(r(409));qo(t,i,null,null)},Qo.prototype.unmount=Bu.prototype.unmount=function(){var t=this._internalRoot;if(t!==null){this._internalRoot=null;var i=t.containerInfo;fr(function(){qo(null,t,null,null)}),i[cn]=null}};function Qo(t){this._internalRoot=t}Qo.prototype.unstable_scheduleHydration=function(t){if(t){var i=yh();t={blockedOn:null,target:t,priority:i};for(var o=0;o<Nn.length&&i!==0&&i<Nn[o].priority;o++);Nn.splice(o,0,t),o===0&&kh(t)}};function zu(t){return!(!t||t.nodeType!==1&&t.nodeType!==9&&t.nodeType!==11)}function Go(t){return!(!t||t.nodeType!==1&&t.nodeType!==9&&t.nodeType!==11&&(t.nodeType!==8||t.nodeValue!==" react-mount-point-unstable "))}function Fp(){}function S0(t,i,o,a,c){if(c){if(typeof a=="function"){var h=a;a=function(){var I=Ko(p);h.call(I)}}var p=Op(i,a,t,0,null,!1,!1,"",Fp);return t._reactRootContainer=p,t[cn]=p.current,Hi(t.nodeType===8?t.parentNode:t),fr(),p}for(;c=t.lastChild;)t.removeChild(c);if(typeof a=="function"){var _=a;a=function(){var I=Ko(v);_.call(I)}}var v=Fu(t,0,!1,null,null,!1,!1,"",Fp);return t._reactRootContainer=v,t[cn]=v.current,Hi(t.nodeType===8?t.parentNode:t),fr(function(){qo(i,v,o,a)}),v}function Yo(t,i,o,a,c){var h=o._reactRootContainer;if(h){var p=h;if(typeof c=="function"){var _=c;c=function(){var v=Ko(p);_.call(v)}}qo(i,p,t,c)}else p=S0(o,i,t,c,a);return Ko(p)}gh=function(t){switch(t.tag){case 3:var i=t.stateNode;if(i.current.memoizedState.isDehydrated){var o=xi(i.pendingLanes);o!==0&&(ca(i,o|1),pt(i,De()),(re&6)===0&&(si=De()+500,On()))}break;case 13:fr(function(){var a=pn(t,1);if(a!==null){var c=st();qt(a,t,1,c)}}),Uu(t,1)}},da=function(t){if(t.tag===13){var i=pn(t,134217728);if(i!==null){var o=st();qt(i,t,134217728,o)}Uu(t,134217728)}},_h=function(t){if(t.tag===13){var i=zn(t),o=pn(t,i);if(o!==null){var a=st();qt(o,t,i,a)}Uu(t,i)}},yh=function(){return de},vh=function(t,i){var o=de;try{return de=t,i()}finally{de=o}},ra=function(t,i,o){switch(i){case"input":if(Gl(t,o),i=o.name,o.type==="radio"&&i!=null){for(o=t;o.parentNode;)o=o.parentNode;for(o=o.querySelectorAll("input[name="+JSON.stringify(""+i)+'][type="radio"]'),i=0;i<o.length;i++){var a=o[i];if(a!==t&&a.form===t.form){var c=fo(a);if(!c)throw Error(r(90));Vd(a),Gl(a,c)}}}break;case"textarea":Qd(t,o);break;case"select":i=o.value,i!=null&&br(t,!!o.multiple,i,!1)}},rh=Au,ih=fr;var T0={usingClientEntryPoint:!1,Events:[$i,qr,fo,th,nh,Au]},ss={findFiberByHostInstance:sr,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},I0={bundleType:ss.bundleType,version:ss.version,rendererPackageName:ss.rendererPackageName,rendererConfig:ss.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:ne.ReactCurrentDispatcher,findHostInstanceByFiber:function(t){return t=ah(t),t===null?null:t.stateNode},findFiberByHostInstance:ss.findFiberByHostInstance||E0,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var Xo=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!Xo.isDisabled&&Xo.supportsFiber)try{Ks=Xo.inject(I0),Jt=Xo}catch{}}return mt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=T0,mt.createPortal=function(t,i){var o=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!zu(i))throw Error(r(200));return C0(t,i,null,o)},mt.createRoot=function(t,i){if(!zu(t))throw Error(r(299));var o=!1,a="",c=bp;return i!=null&&(i.unstable_strictMode===!0&&(o=!0),i.identifierPrefix!==void 0&&(a=i.identifierPrefix),i.onRecoverableError!==void 0&&(c=i.onRecoverableError)),i=Fu(t,1,!1,null,null,o,!1,a,c),t[cn]=i.current,Hi(t.nodeType===8?t.parentNode:t),new Bu(i)},mt.findDOMNode=function(t){if(t==null)return null;if(t.nodeType===1)return t;var i=t._reactInternals;if(i===void 0)throw typeof t.render=="function"?Error(r(188)):(t=Object.keys(t).join(","),Error(r(268,t)));return t=ah(i),t=t===null?null:t.stateNode,t},mt.flushSync=function(t){return fr(t)},mt.hydrate=function(t,i,o){if(!Go(i))throw Error(r(200));return Yo(null,t,i,!0,o)},mt.hydrateRoot=function(t,i,o){if(!zu(t))throw Error(r(405));var a=o!=null&&o.hydratedSources||null,c=!1,h="",p=bp;if(o!=null&&(o.unstable_strictMode===!0&&(c=!0),o.identifierPrefix!==void 0&&(h=o.identifierPrefix),o.onRecoverableError!==void 0&&(p=o.onRecoverableError)),i=Op(i,null,t,1,o??null,c,!1,h,p),t[cn]=i.current,Hi(t),a)for(t=0;t<a.length;t++)o=a[t],c=o._getVersion,c=c(o._source),i.mutableSourceEagerHydrationData==null?i.mutableSourceEagerHydrationData=[o,c]:i.mutableSourceEagerHydrationData.push(o,c);return new Qo(i)},mt.render=function(t,i,o){if(!Go(i))throw Error(r(200));return Yo(null,t,i,!1,o)},mt.unmountComponentAtNode=function(t){if(!Go(t))throw Error(r(40));return t._reactRootContainer?(fr(function(){Yo(null,null,t,!1,function(){t._reactRootContainer=null,t[cn]=null})}),!0):!1},mt.unstable_batchedUpdates=Au,mt.unstable_renderSubtreeIntoContainer=function(t,i,o,a){if(!Go(o))throw Error(r(200));if(t==null||t._reactInternals===void 0)throw Error(r(38));return Yo(t,i,o,!1,a)},mt.version="18.3.1-next-f1338f8080-20240426",mt}var $p;function eg(){if($p)return Vu.exports;$p=1;function n(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n)}catch(e){console.error(e)}}return n(),Vu.exports=D0(),Vu.exports}var qp;function O0(){if(qp)return Zo;qp=1;var n=eg();return Zo.createRoot=n.createRoot,Zo.hydrateRoot=n.hydrateRoot,Zo}var L0=O0();const tI=Jm(L0),b0=()=>{};var Kp={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const tg={NODE_ADMIN:!1,SDK_VERSION:"${JSCORE_VERSION}"};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const D=function(n,e){if(!n)throw gi(e)},gi=function(n){return new Error("Firebase Database ("+tg.SDK_VERSION+") INTERNAL ASSERT FAILED: "+n)};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ng=function(n){const e=[];let r=0;for(let s=0;s<n.length;s++){let l=n.charCodeAt(s);l<128?e[r++]=l:l<2048?(e[r++]=l>>6|192,e[r++]=l&63|128):(l&64512)===55296&&s+1<n.length&&(n.charCodeAt(s+1)&64512)===56320?(l=65536+((l&1023)<<10)+(n.charCodeAt(++s)&1023),e[r++]=l>>18|240,e[r++]=l>>12&63|128,e[r++]=l>>6&63|128,e[r++]=l&63|128):(e[r++]=l>>12|224,e[r++]=l>>6&63|128,e[r++]=l&63|128)}return e},F0=function(n){const e=[];let r=0,s=0;for(;r<n.length;){const l=n[r++];if(l<128)e[s++]=String.fromCharCode(l);else if(l>191&&l<224){const u=n[r++];e[s++]=String.fromCharCode((l&31)<<6|u&63)}else if(l>239&&l<365){const u=n[r++],d=n[r++],f=n[r++],m=((l&7)<<18|(u&63)<<12|(d&63)<<6|f&63)-65536;e[s++]=String.fromCharCode(55296+(m>>10)),e[s++]=String.fromCharCode(56320+(m&1023))}else{const u=n[r++],d=n[r++];e[s++]=String.fromCharCode((l&15)<<12|(u&63)<<6|d&63)}}return e.join("")},jc={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(n,e){if(!Array.isArray(n))throw Error("encodeByteArray takes an array as a parameter");this.init_();const r=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,s=[];for(let l=0;l<n.length;l+=3){const u=n[l],d=l+1<n.length,f=d?n[l+1]:0,m=l+2<n.length,g=m?n[l+2]:0,y=u>>2,w=(u&3)<<4|f>>4;let k=(f&15)<<2|g>>6,P=g&63;m||(P=64,d||(k=64)),s.push(r[y],r[w],r[k],r[P])}return s.join("")},encodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(n):this.encodeByteArray(ng(n),e)},decodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(n):F0(this.decodeStringToByteArray(n,e))},decodeStringToByteArray(n,e){this.init_();const r=e?this.charToByteMapWebSafe_:this.charToByteMap_,s=[];for(let l=0;l<n.length;){const u=r[n.charAt(l++)],f=l<n.length?r[n.charAt(l)]:0;++l;const g=l<n.length?r[n.charAt(l)]:64;++l;const w=l<n.length?r[n.charAt(l)]:64;if(++l,u==null||f==null||g==null||w==null)throw new U0;const k=u<<2|f>>4;if(s.push(k),g!==64){const P=f<<4&240|g>>2;if(s.push(P),w!==64){const L=g<<6&192|w;s.push(L)}}}return s},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let n=0;n<this.ENCODED_VALS.length;n++)this.byteToCharMap_[n]=this.ENCODED_VALS.charAt(n),this.charToByteMap_[this.byteToCharMap_[n]]=n,this.byteToCharMapWebSafe_[n]=this.ENCODED_VALS_WEBSAFE.charAt(n),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[n]]=n,n>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(n)]=n,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(n)]=n)}}};class U0 extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const rg=function(n){const e=ng(n);return jc.encodeByteArray(e,!0)},rl=function(n){return rg(n).replace(/\./g,"")},dc=function(n){try{return jc.decodeString(n,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function B0(n){return ig(void 0,n)}function ig(n,e){if(!(e instanceof Object))return e;switch(e.constructor){case Date:const r=e;return new Date(r.getTime());case Object:n===void 0&&(n={});break;case Array:n=[];break;default:return e}for(const r in e)!e.hasOwnProperty(r)||!z0(r)||(n[r]=ig(n[r],e[r]));return n}function z0(n){return n!=="__proto__"}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function j0(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const H0=()=>j0().__FIREBASE_DEFAULTS__,V0=()=>{if(typeof process>"u"||typeof Kp>"u")return;const n=Kp.__FIREBASE_DEFAULTS__;if(n)return JSON.parse(n)},W0=()=>{if(typeof document>"u")return;let n;try{n=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=n&&dc(n[1]);return e&&JSON.parse(e)},sg=()=>{try{return b0()||H0()||V0()||W0()}catch(n){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${n}`);return}},$0=n=>{var e,r;return(r=(e=sg())===null||e===void 0?void 0:e.emulatorHosts)===null||r===void 0?void 0:r[n]},og=n=>{const e=$0(n);if(!e)return;const r=e.lastIndexOf(":");if(r<=0||r+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const s=parseInt(e.substring(r+1),10);return e[0]==="["?[e.substring(1,r-1),s]:[e.substring(0,r),s]},lg=()=>{var n;return(n=sg())===null||n===void 0?void 0:n.config};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class St{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,r)=>{this.resolve=e,this.reject=r})}wrapCallback(e){return(r,s)=>{r?this.reject(r):this.resolve(s),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(r):e(r,s))}}}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ns(n){try{return(n.startsWith("http://")||n.startsWith("https://")?new URL(n).hostname:n).endsWith(".cloudworkstations.dev")}catch{return!1}}async function ag(n){return(await fetch(n,{credentials:"include"})).ok}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ug(n,e){if(n.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const r={alg:"none",type:"JWT"},s=e||"demo-project",l=n.iat||0,u=n.sub||n.user_id;if(!u)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const d=Object.assign({iss:`https://securetoken.google.com/${s}`,aud:s,iat:l,exp:l+3600,auth_time:l,sub:u,user_id:u,firebase:{sign_in_provider:"custom",identities:{}}},n);return[rl(JSON.stringify(r)),rl(JSON.stringify(d)),""].join(".")}const hs={};function q0(){const n={prod:[],emulator:[]};for(const e of Object.keys(hs))hs[e]?n.emulator.push(e):n.prod.push(e);return n}function K0(n){let e=document.getElementById(n),r=!1;return e||(e=document.createElement("div"),e.setAttribute("id",n),r=!0),{created:r,element:e}}let Qp=!1;function cg(n,e){if(typeof window>"u"||typeof document>"u"||!Ns(window.location.host)||hs[n]===e||hs[n]||Qp)return;hs[n]=e;function r(k){return`__firebase__banner__${k}`}const s="__firebase__banner",u=q0().prod.length>0;function d(){const k=document.getElementById(s);k&&k.remove()}function f(k){k.style.display="flex",k.style.background="#7faaf0",k.style.position="fixed",k.style.bottom="5px",k.style.left="5px",k.style.padding=".5em",k.style.borderRadius="5px",k.style.alignItems="center"}function m(k,P){k.setAttribute("width","24"),k.setAttribute("id",P),k.setAttribute("height","24"),k.setAttribute("viewBox","0 0 24 24"),k.setAttribute("fill","none"),k.style.marginLeft="-6px"}function g(){const k=document.createElement("span");return k.style.cursor="pointer",k.style.marginLeft="16px",k.style.fontSize="24px",k.innerHTML=" &times;",k.onclick=()=>{Qp=!0,d()},k}function y(k,P){k.setAttribute("id",P),k.innerText="Learn more",k.href="https://firebase.google.com/docs/studio/preview-apps#preview-backend",k.setAttribute("target","__blank"),k.style.paddingLeft="5px",k.style.textDecoration="underline"}function w(){const k=K0(s),P=r("text"),L=document.getElementById(P)||document.createElement("span"),U=r("learnmore"),H=document.getElementById(U)||document.createElement("a"),pe=r("preprendIcon"),he=document.getElementById(pe)||document.createElementNS("http://www.w3.org/2000/svg","svg");if(k.created){const ae=k.element;f(ae),y(H,U);const ne=g();m(he,pe),ae.append(he,L,H,ne),document.body.appendChild(ae)}u?(L.innerText="Preview backend disconnected.",he.innerHTML=`<g clip-path="url(#clip0_6013_33858)">
<path d="M4.8 17.6L12 5.6L19.2 17.6H4.8ZM6.91667 16.4H17.0833L12 7.93333L6.91667 16.4ZM12 15.6C12.1667 15.6 12.3056 15.5444 12.4167 15.4333C12.5389 15.3111 12.6 15.1667 12.6 15C12.6 14.8333 12.5389 14.6944 12.4167 14.5833C12.3056 14.4611 12.1667 14.4 12 14.4C11.8333 14.4 11.6889 14.4611 11.5667 14.5833C11.4556 14.6944 11.4 14.8333 11.4 15C11.4 15.1667 11.4556 15.3111 11.5667 15.4333C11.6889 15.5444 11.8333 15.6 12 15.6ZM11.4 13.6H12.6V10.4H11.4V13.6Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6013_33858">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`):(he.innerHTML=`<g clip-path="url(#clip0_6083_34804)">
<path d="M11.4 15.2H12.6V11.2H11.4V15.2ZM12 10C12.1667 10 12.3056 9.94444 12.4167 9.83333C12.5389 9.71111 12.6 9.56667 12.6 9.4C12.6 9.23333 12.5389 9.09444 12.4167 8.98333C12.3056 8.86111 12.1667 8.8 12 8.8C11.8333 8.8 11.6889 8.86111 11.5667 8.98333C11.4556 9.09444 11.4 9.23333 11.4 9.4C11.4 9.56667 11.4556 9.71111 11.5667 9.83333C11.6889 9.94444 11.8333 10 12 10ZM12 18.4C11.1222 18.4 10.2944 18.2333 9.51667 17.9C8.73889 17.5667 8.05556 17.1111 7.46667 16.5333C6.88889 15.9444 6.43333 15.2611 6.1 14.4833C5.76667 13.7056 5.6 12.8778 5.6 12C5.6 11.1111 5.76667 10.2833 6.1 9.51667C6.43333 8.73889 6.88889 8.06111 7.46667 7.48333C8.05556 6.89444 8.73889 6.43333 9.51667 6.1C10.2944 5.76667 11.1222 5.6 12 5.6C12.8889 5.6 13.7167 5.76667 14.4833 6.1C15.2611 6.43333 15.9389 6.89444 16.5167 7.48333C17.1056 8.06111 17.5667 8.73889 17.9 9.51667C18.2333 10.2833 18.4 11.1111 18.4 12C18.4 12.8778 18.2333 13.7056 17.9 14.4833C17.5667 15.2611 17.1056 15.9444 16.5167 16.5333C15.9389 17.1111 15.2611 17.5667 14.4833 17.9C13.7167 18.2333 12.8889 18.4 12 18.4ZM12 17.2C13.4444 17.2 14.6722 16.6944 15.6833 15.6833C16.6944 14.6722 17.2 13.4444 17.2 12C17.2 10.5556 16.6944 9.32778 15.6833 8.31667C14.6722 7.30555 13.4444 6.8 12 6.8C10.5556 6.8 9.32778 7.30555 8.31667 8.31667C7.30556 9.32778 6.8 10.5556 6.8 12C6.8 13.4444 7.30556 14.6722 8.31667 15.6833C9.32778 16.6944 10.5556 17.2 12 17.2Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6083_34804">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`,L.innerText="Preview backend running in this workspace."),L.setAttribute("id",P)}document.readyState==="loading"?window.addEventListener("DOMContentLoaded",w):w()}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Q0(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function dg(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(Q0())}function G0(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function Y0(){return tg.NODE_ADMIN===!0}function hg(){try{return typeof indexedDB=="object"}catch{return!1}}function fg(){return new Promise((n,e)=>{try{let r=!0;const s="validate-browser-context-for-indexeddb-analytics-module",l=self.indexedDB.open(s);l.onsuccess=()=>{l.result.close(),r||self.indexedDB.deleteDatabase(s),n(!0)},l.onupgradeneeded=()=>{r=!1},l.onerror=()=>{var u;e(((u=l.error)===null||u===void 0?void 0:u.message)||"")}}catch(r){e(r)}})}function X0(){return!(typeof navigator>"u"||!navigator.cookieEnabled)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Z0="FirebaseError";class Mr extends Error{constructor(e,r,s){super(r),this.code=e,this.customData=s,this.name=Z0,Object.setPrototypeOf(this,Mr.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,kl.prototype.create)}}class kl{constructor(e,r,s){this.service=e,this.serviceName=r,this.errors=s}create(e,...r){const s=r[0]||{},l=`${this.service}/${e}`,u=this.errors[e],d=u?J0(u,s):"Error",f=`${this.serviceName}: ${d} (${l}).`;return new Mr(l,f,s)}}function J0(n,e){return n.replace(ev,(r,s)=>{const l=e[s];return l!=null?String(l):`<${s}?>`})}const ev=/\{\$([^}]+)}/g;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ys(n){return JSON.parse(n)}function Be(n){return JSON.stringify(n)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const pg=function(n){let e={},r={},s={},l="";try{const u=n.split(".");e=ys(dc(u[0])||""),r=ys(dc(u[1])||""),l=u[2],s=r.d||{},delete r.d}catch{}return{header:e,claims:r,data:s,signature:l}},tv=function(n){const e=pg(n),r=e.claims;return!!r&&typeof r=="object"&&r.hasOwnProperty("iat")},nv=function(n){const e=pg(n).claims;return typeof e=="object"&&e.admin===!0};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Yt(n,e){return Object.prototype.hasOwnProperty.call(n,e)}function Er(n,e){if(Object.prototype.hasOwnProperty.call(n,e))return n[e]}function hc(n){for(const e in n)if(Object.prototype.hasOwnProperty.call(n,e))return!1;return!0}function il(n,e,r){const s={};for(const l in n)Object.prototype.hasOwnProperty.call(n,l)&&(s[l]=e.call(r,n[l],l,n));return s}function sl(n,e){if(n===e)return!0;const r=Object.keys(n),s=Object.keys(e);for(const l of r){if(!s.includes(l))return!1;const u=n[l],d=e[l];if(Gp(u)&&Gp(d)){if(!sl(u,d))return!1}else if(u!==d)return!1}for(const l of s)if(!r.includes(l))return!1;return!0}function Gp(n){return n!==null&&typeof n=="object"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function rv(n){const e=[];for(const[r,s]of Object.entries(n))Array.isArray(s)?s.forEach(l=>{e.push(encodeURIComponent(r)+"="+encodeURIComponent(l))}):e.push(encodeURIComponent(r)+"="+encodeURIComponent(s));return e.length?"&"+e.join("&"):""}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class iv{constructor(){this.chain_=[],this.buf_=[],this.W_=[],this.pad_=[],this.inbuf_=0,this.total_=0,this.blockSize=512/8,this.pad_[0]=128;for(let e=1;e<this.blockSize;++e)this.pad_[e]=0;this.reset()}reset(){this.chain_[0]=1732584193,this.chain_[1]=4023233417,this.chain_[2]=2562383102,this.chain_[3]=271733878,this.chain_[4]=3285377520,this.inbuf_=0,this.total_=0}compress_(e,r){r||(r=0);const s=this.W_;if(typeof e=="string")for(let w=0;w<16;w++)s[w]=e.charCodeAt(r)<<24|e.charCodeAt(r+1)<<16|e.charCodeAt(r+2)<<8|e.charCodeAt(r+3),r+=4;else for(let w=0;w<16;w++)s[w]=e[r]<<24|e[r+1]<<16|e[r+2]<<8|e[r+3],r+=4;for(let w=16;w<80;w++){const k=s[w-3]^s[w-8]^s[w-14]^s[w-16];s[w]=(k<<1|k>>>31)&4294967295}let l=this.chain_[0],u=this.chain_[1],d=this.chain_[2],f=this.chain_[3],m=this.chain_[4],g,y;for(let w=0;w<80;w++){w<40?w<20?(g=f^u&(d^f),y=1518500249):(g=u^d^f,y=1859775393):w<60?(g=u&d|f&(u|d),y=2400959708):(g=u^d^f,y=3395469782);const k=(l<<5|l>>>27)+g+m+y+s[w]&4294967295;m=f,f=d,d=(u<<30|u>>>2)&4294967295,u=l,l=k}this.chain_[0]=this.chain_[0]+l&4294967295,this.chain_[1]=this.chain_[1]+u&4294967295,this.chain_[2]=this.chain_[2]+d&4294967295,this.chain_[3]=this.chain_[3]+f&4294967295,this.chain_[4]=this.chain_[4]+m&4294967295}update(e,r){if(e==null)return;r===void 0&&(r=e.length);const s=r-this.blockSize;let l=0;const u=this.buf_;let d=this.inbuf_;for(;l<r;){if(d===0)for(;l<=s;)this.compress_(e,l),l+=this.blockSize;if(typeof e=="string"){for(;l<r;)if(u[d]=e.charCodeAt(l),++d,++l,d===this.blockSize){this.compress_(u),d=0;break}}else for(;l<r;)if(u[d]=e[l],++d,++l,d===this.blockSize){this.compress_(u),d=0;break}}this.inbuf_=d,this.total_+=r}digest(){const e=[];let r=this.total_*8;this.inbuf_<56?this.update(this.pad_,56-this.inbuf_):this.update(this.pad_,this.blockSize-(this.inbuf_-56));for(let l=this.blockSize-1;l>=56;l--)this.buf_[l]=r&255,r/=256;this.compress_(this.buf_);let s=0;for(let l=0;l<5;l++)for(let u=24;u>=0;u-=8)e[s]=this.chain_[l]>>u&255,++s;return e}}function Sr(n,e){return`${n} failed: ${e} argument `}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const sv=function(n){const e=[];let r=0;for(let s=0;s<n.length;s++){let l=n.charCodeAt(s);if(l>=55296&&l<=56319){const u=l-55296;s++,D(s<n.length,"Surrogate pair missing trail surrogate.");const d=n.charCodeAt(s)-56320;l=65536+(u<<10)+d}l<128?e[r++]=l:l<2048?(e[r++]=l>>6|192,e[r++]=l&63|128):l<65536?(e[r++]=l>>12|224,e[r++]=l>>6&63|128,e[r++]=l&63|128):(e[r++]=l>>18|240,e[r++]=l>>12&63|128,e[r++]=l>>6&63|128,e[r++]=l&63|128)}return e},Cl=function(n){let e=0;for(let r=0;r<n.length;r++){const s=n.charCodeAt(r);s<128?e++:s<2048?e+=2:s>=55296&&s<=56319?(e+=4,r++):e+=3}return e};/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ne(n){return n&&n._delegate?n._delegate:n}class bt{constructor(e,r,s){this.name=e,this.instanceFactory=r,this.type=s,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _r="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fc{constructor(e,r){this.name=e,this.container=r,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const r=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(r)){const s=new St;if(this.instancesDeferred.set(r,s),this.isInitialized(r)||this.shouldAutoInitialize())try{const l=this.getOrInitializeService({instanceIdentifier:r});l&&s.resolve(l)}catch{}}return this.instancesDeferred.get(r).promise}getImmediate(e){var r;const s=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),l=(r=e==null?void 0:e.optional)!==null&&r!==void 0?r:!1;if(this.isInitialized(s)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:s})}catch(u){if(l)return null;throw u}else{if(l)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(lv(e))try{this.getOrInitializeService({instanceIdentifier:_r})}catch{}for(const[r,s]of this.instancesDeferred.entries()){const l=this.normalizeInstanceIdentifier(r);try{const u=this.getOrInitializeService({instanceIdentifier:l});s.resolve(u)}catch{}}}}clearInstance(e=_r){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(r=>"INTERNAL"in r).map(r=>r.INTERNAL.delete()),...e.filter(r=>"_delete"in r).map(r=>r._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=_r){return this.instances.has(e)}getOptions(e=_r){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:r={}}=e,s=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(s))throw Error(`${this.name}(${s}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const l=this.getOrInitializeService({instanceIdentifier:s,options:r});for(const[u,d]of this.instancesDeferred.entries()){const f=this.normalizeInstanceIdentifier(u);s===f&&d.resolve(l)}return l}onInit(e,r){var s;const l=this.normalizeInstanceIdentifier(r),u=(s=this.onInitCallbacks.get(l))!==null&&s!==void 0?s:new Set;u.add(e),this.onInitCallbacks.set(l,u);const d=this.instances.get(l);return d&&e(d,l),()=>{u.delete(e)}}invokeOnInitCallbacks(e,r){const s=this.onInitCallbacks.get(r);if(s)for(const l of s)try{l(e,r)}catch{}}getOrInitializeService({instanceIdentifier:e,options:r={}}){let s=this.instances.get(e);if(!s&&this.component&&(s=this.component.instanceFactory(this.container,{instanceIdentifier:ov(e),options:r}),this.instances.set(e,s),this.instancesOptions.set(e,r),this.invokeOnInitCallbacks(s,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,s)}catch{}return s||null}normalizeInstanceIdentifier(e=_r){return this.component?this.component.multipleInstances?e:_r:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function ov(n){return n===_r?void 0:n}function lv(n){return n.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mg{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const r=this.getProvider(e.name);if(r.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);r.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const r=new fc(e,this);return this.providers.set(e,r),r}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ye;(function(n){n[n.DEBUG=0]="DEBUG",n[n.VERBOSE=1]="VERBOSE",n[n.INFO=2]="INFO",n[n.WARN=3]="WARN",n[n.ERROR=4]="ERROR",n[n.SILENT=5]="SILENT"})(ye||(ye={}));const av={debug:ye.DEBUG,verbose:ye.VERBOSE,info:ye.INFO,warn:ye.WARN,error:ye.ERROR,silent:ye.SILENT},uv=ye.INFO,cv={[ye.DEBUG]:"log",[ye.VERBOSE]:"log",[ye.INFO]:"info",[ye.WARN]:"warn",[ye.ERROR]:"error"},dv=(n,e,...r)=>{if(e<n.logLevel)return;const s=new Date().toISOString(),l=cv[e];if(l)console[l](`[${s}]  ${n.name}:`,...r);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class gg{constructor(e){this.name=e,this._logLevel=uv,this._logHandler=dv,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in ye))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?av[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,ye.DEBUG,...e),this._logHandler(this,ye.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,ye.VERBOSE,...e),this._logHandler(this,ye.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,ye.INFO,...e),this._logHandler(this,ye.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,ye.WARN,...e),this._logHandler(this,ye.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,ye.ERROR,...e),this._logHandler(this,ye.ERROR,...e)}}const hv=(n,e)=>e.some(r=>n instanceof r);let Yp,Xp;function fv(){return Yp||(Yp=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function pv(){return Xp||(Xp=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const _g=new WeakMap,pc=new WeakMap,yg=new WeakMap,qu=new WeakMap,Hc=new WeakMap;function mv(n){const e=new Promise((r,s)=>{const l=()=>{n.removeEventListener("success",u),n.removeEventListener("error",d)},u=()=>{r(wn(n.result)),l()},d=()=>{s(n.error),l()};n.addEventListener("success",u),n.addEventListener("error",d)});return e.then(r=>{r instanceof IDBCursor&&_g.set(r,n)}).catch(()=>{}),Hc.set(e,n),e}function gv(n){if(pc.has(n))return;const e=new Promise((r,s)=>{const l=()=>{n.removeEventListener("complete",u),n.removeEventListener("error",d),n.removeEventListener("abort",d)},u=()=>{r(),l()},d=()=>{s(n.error||new DOMException("AbortError","AbortError")),l()};n.addEventListener("complete",u),n.addEventListener("error",d),n.addEventListener("abort",d)});pc.set(n,e)}let mc={get(n,e,r){if(n instanceof IDBTransaction){if(e==="done")return pc.get(n);if(e==="objectStoreNames")return n.objectStoreNames||yg.get(n);if(e==="store")return r.objectStoreNames[1]?void 0:r.objectStore(r.objectStoreNames[0])}return wn(n[e])},set(n,e,r){return n[e]=r,!0},has(n,e){return n instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in n}};function _v(n){mc=n(mc)}function yv(n){return n===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...r){const s=n.call(Ku(this),e,...r);return yg.set(s,e.sort?e.sort():[e]),wn(s)}:pv().includes(n)?function(...e){return n.apply(Ku(this),e),wn(_g.get(this))}:function(...e){return wn(n.apply(Ku(this),e))}}function vv(n){return typeof n=="function"?yv(n):(n instanceof IDBTransaction&&gv(n),hv(n,fv())?new Proxy(n,mc):n)}function wn(n){if(n instanceof IDBRequest)return mv(n);if(qu.has(n))return qu.get(n);const e=vv(n);return e!==n&&(qu.set(n,e),Hc.set(e,n)),e}const Ku=n=>Hc.get(n);function El(n,e,{blocked:r,upgrade:s,blocking:l,terminated:u}={}){const d=indexedDB.open(n,e),f=wn(d);return s&&d.addEventListener("upgradeneeded",m=>{s(wn(d.result),m.oldVersion,m.newVersion,wn(d.transaction),m)}),r&&d.addEventListener("blocked",m=>r(m.oldVersion,m.newVersion,m)),f.then(m=>{u&&m.addEventListener("close",()=>u()),l&&m.addEventListener("versionchange",g=>l(g.oldVersion,g.newVersion,g))}).catch(()=>{}),f}function Qu(n,{blocked:e}={}){const r=indexedDB.deleteDatabase(n);return e&&r.addEventListener("blocked",s=>e(s.oldVersion,s)),wn(r).then(()=>{})}const wv=["get","getKey","getAll","getAllKeys","count"],kv=["put","add","delete","clear"],Gu=new Map;function Zp(n,e){if(!(n instanceof IDBDatabase&&!(e in n)&&typeof e=="string"))return;if(Gu.get(e))return Gu.get(e);const r=e.replace(/FromIndex$/,""),s=e!==r,l=kv.includes(r);if(!(r in(s?IDBIndex:IDBObjectStore).prototype)||!(l||wv.includes(r)))return;const u=async function(d,...f){const m=this.transaction(d,l?"readwrite":"readonly");let g=m.store;return s&&(g=g.index(f.shift())),(await Promise.all([g[r](...f),l&&m.done]))[0]};return Gu.set(e,u),u}_v(n=>({...n,get:(e,r,s)=>Zp(e,r)||n.get(e,r,s),has:(e,r)=>!!Zp(e,r)||n.has(e,r)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Cv{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(r=>{if(Ev(r)){const s=r.getImmediate();return`${s.library}/${s.version}`}else return null}).filter(r=>r).join(" ")}}function Ev(n){const e=n.getComponent();return(e==null?void 0:e.type)==="VERSION"}const gc="@firebase/app",Jp="0.13.2";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const kn=new gg("@firebase/app"),Sv="@firebase/app-compat",Tv="@firebase/analytics-compat",Iv="@firebase/analytics",xv="@firebase/app-check-compat",Nv="@firebase/app-check",Rv="@firebase/auth",Pv="@firebase/auth-compat",Av="@firebase/database",Mv="@firebase/data-connect",Dv="@firebase/database-compat",Ov="@firebase/functions",Lv="@firebase/functions-compat",bv="@firebase/installations",Fv="@firebase/installations-compat",Uv="@firebase/messaging",Bv="@firebase/messaging-compat",zv="@firebase/performance",jv="@firebase/performance-compat",Hv="@firebase/remote-config",Vv="@firebase/remote-config-compat",Wv="@firebase/storage",$v="@firebase/storage-compat",qv="@firebase/firestore",Kv="@firebase/ai",Qv="@firebase/firestore-compat",Gv="firebase",Yv="11.10.0";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _c="[DEFAULT]",Xv={[gc]:"fire-core",[Sv]:"fire-core-compat",[Iv]:"fire-analytics",[Tv]:"fire-analytics-compat",[Nv]:"fire-app-check",[xv]:"fire-app-check-compat",[Rv]:"fire-auth",[Pv]:"fire-auth-compat",[Av]:"fire-rtdb",[Mv]:"fire-data-connect",[Dv]:"fire-rtdb-compat",[Ov]:"fire-fn",[Lv]:"fire-fn-compat",[bv]:"fire-iid",[Fv]:"fire-iid-compat",[Uv]:"fire-fcm",[Bv]:"fire-fcm-compat",[zv]:"fire-perf",[jv]:"fire-perf-compat",[Hv]:"fire-rc",[Vv]:"fire-rc-compat",[Wv]:"fire-gcs",[$v]:"fire-gcs-compat",[qv]:"fire-fst",[Qv]:"fire-fst-compat",[Kv]:"fire-vertex","fire-js":"fire-js",[Gv]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ol=new Map,Zv=new Map,yc=new Map;function em(n,e){try{n.container.addComponent(e)}catch(r){kn.debug(`Component ${e.name} failed to register with FirebaseApp ${n.name}`,r)}}function Cn(n){const e=n.name;if(yc.has(e))return kn.debug(`There were multiple attempts to register component ${e}.`),!1;yc.set(e,n);for(const r of ol.values())em(r,n);for(const r of Zv.values())em(r,n);return!0}function Rs(n,e){const r=n.container.getProvider("heartbeat").getImmediate({optional:!0});return r&&r.triggerHeartbeat(),n.container.getProvider(e)}function vg(n){return n==null?!1:n.settings!==void 0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Jv={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},Kn=new kl("app","Firebase",Jv);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ew{constructor(e,r,s){this._isDeleted=!1,this._options=Object.assign({},e),this._config=Object.assign({},r),this._name=r.name,this._automaticDataCollectionEnabled=r.automaticDataCollectionEnabled,this._container=s,this.container.addComponent(new bt("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw Kn.create("app-deleted",{appName:this._name})}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wg=Yv;function tw(n,e={}){let r=n;typeof e!="object"&&(e={name:e});const s=Object.assign({name:_c,automaticDataCollectionEnabled:!0},e),l=s.name;if(typeof l!="string"||!l)throw Kn.create("bad-app-name",{appName:String(l)});if(r||(r=lg()),!r)throw Kn.create("no-options");const u=ol.get(l);if(u){if(sl(r,u.options)&&sl(s,u.config))return u;throw Kn.create("duplicate-app",{appName:l})}const d=new mg(l);for(const m of yc.values())d.addComponent(m);const f=new ew(r,s,d);return ol.set(l,f),f}function Vc(n=_c){const e=ol.get(n);if(!e&&n===_c&&lg())return tw();if(!e)throw Kn.create("no-app",{appName:n});return e}function Ot(n,e,r){var s;let l=(s=Xv[n])!==null&&s!==void 0?s:n;r&&(l+=`-${r}`);const u=l.match(/\s|\//),d=e.match(/\s|\//);if(u||d){const f=[`Unable to register library "${l}" with version "${e}":`];u&&f.push(`library name "${l}" contains illegal characters (whitespace or "/")`),u&&d&&f.push("and"),d&&f.push(`version name "${e}" contains illegal characters (whitespace or "/")`),kn.warn(f.join(" "));return}Cn(new bt(`${l}-version`,()=>({library:l,version:e}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const nw="firebase-heartbeat-database",rw=1,vs="firebase-heartbeat-store";let Yu=null;function kg(){return Yu||(Yu=El(nw,rw,{upgrade:(n,e)=>{switch(e){case 0:try{n.createObjectStore(vs)}catch(r){console.warn(r)}}}}).catch(n=>{throw Kn.create("idb-open",{originalErrorMessage:n.message})})),Yu}async function iw(n){try{const r=(await kg()).transaction(vs),s=await r.objectStore(vs).get(Cg(n));return await r.done,s}catch(e){if(e instanceof Mr)kn.warn(e.message);else{const r=Kn.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});kn.warn(r.message)}}}async function tm(n,e){try{const s=(await kg()).transaction(vs,"readwrite");await s.objectStore(vs).put(e,Cg(n)),await s.done}catch(r){if(r instanceof Mr)kn.warn(r.message);else{const s=Kn.create("idb-set",{originalErrorMessage:r==null?void 0:r.message});kn.warn(s.message)}}}function Cg(n){return`${n.name}!${n.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const sw=1024,ow=30;class lw{constructor(e){this.container=e,this._heartbeatsCache=null;const r=this.container.getProvider("app").getImmediate();this._storage=new uw(r),this._heartbeatsCachePromise=this._storage.read().then(s=>(this._heartbeatsCache=s,s))}async triggerHeartbeat(){var e,r;try{const l=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),u=nm();if(((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((r=this._heartbeatsCache)===null||r===void 0?void 0:r.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===u||this._heartbeatsCache.heartbeats.some(d=>d.date===u))return;if(this._heartbeatsCache.heartbeats.push({date:u,agent:l}),this._heartbeatsCache.heartbeats.length>ow){const d=cw(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(d,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(s){kn.warn(s)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const r=nm(),{heartbeatsToSend:s,unsentEntries:l}=aw(this._heartbeatsCache.heartbeats),u=rl(JSON.stringify({version:2,heartbeats:s}));return this._heartbeatsCache.lastSentHeartbeatDate=r,l.length>0?(this._heartbeatsCache.heartbeats=l,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),u}catch(r){return kn.warn(r),""}}}function nm(){return new Date().toISOString().substring(0,10)}function aw(n,e=sw){const r=[];let s=n.slice();for(const l of n){const u=r.find(d=>d.agent===l.agent);if(u){if(u.dates.push(l.date),rm(r)>e){u.dates.pop();break}}else if(r.push({agent:l.agent,dates:[l.date]}),rm(r)>e){r.pop();break}s=s.slice(1)}return{heartbeatsToSend:r,unsentEntries:s}}class uw{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return hg()?fg().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const r=await iw(this.app);return r!=null&&r.heartbeats?r:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){var r;if(await this._canUseIndexedDBPromise){const l=await this.read();return tm(this.app,{lastSentHeartbeatDate:(r=e.lastSentHeartbeatDate)!==null&&r!==void 0?r:l.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){var r;if(await this._canUseIndexedDBPromise){const l=await this.read();return tm(this.app,{lastSentHeartbeatDate:(r=e.lastSentHeartbeatDate)!==null&&r!==void 0?r:l.lastSentHeartbeatDate,heartbeats:[...l.heartbeats,...e.heartbeats]})}else return}}function rm(n){return rl(JSON.stringify({version:2,heartbeats:n})).length}function cw(n){if(n.length===0)return-1;let e=0,r=n[0].date;for(let s=1;s<n.length;s++)n[s].date<r&&(r=n[s].date,e=s);return e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function dw(n){Cn(new bt("platform-logger",e=>new Cv(e),"PRIVATE")),Cn(new bt("heartbeat",e=>new lw(e),"PRIVATE")),Ot(gc,Jp,n),Ot(gc,Jp,"esm2017"),Ot("fire-js","")}dw("");var hw="firebase",fw="11.10.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Ot(hw,fw,"app");var im={};const sm="@firebase/database",om="1.0.20";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Eg="";function Wc(n){Eg=n}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pw{constructor(e){this.domStorage_=e,this.prefix_="firebase:"}set(e,r){r==null?this.domStorage_.removeItem(this.prefixedName_(e)):this.domStorage_.setItem(this.prefixedName_(e),Be(r))}get(e){const r=this.domStorage_.getItem(this.prefixedName_(e));return r==null?null:ys(r)}remove(e){this.domStorage_.removeItem(this.prefixedName_(e))}prefixedName_(e){return this.prefix_+e}toString(){return this.domStorage_.toString()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mw{constructor(){this.cache_={},this.isInMemoryStorage=!0}set(e,r){r==null?delete this.cache_[e]:this.cache_[e]=r}get(e){return Yt(this.cache_,e)?this.cache_[e]:null}remove(e){delete this.cache_[e]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Sg=function(n){try{if(typeof window<"u"&&typeof window[n]<"u"){const e=window[n];return e.setItem("firebase:sentinel","cache"),e.removeItem("firebase:sentinel"),new pw(e)}}catch{}return new mw},vr=Sg("localStorage"),vc=Sg("sessionStorage");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ui=new gg("@firebase/database"),Tg=(function(){let n=1;return function(){return n++}})(),Ig=function(n){const e=sv(n),r=new iv;r.update(e);const s=r.digest();return jc.encodeByteArray(s)},Ps=function(...n){let e="";for(let r=0;r<n.length;r++){const s=n[r];Array.isArray(s)||s&&typeof s=="object"&&typeof s.length=="number"?e+=Ps.apply(null,s):typeof s=="object"?e+=Be(s):e+=s,e+=" "}return e};let kr=null,lm=!0;const xg=function(n,e){D(!e||n===!0||n===!1,"Can't turn on custom loggers persistently."),n===!0?(ui.logLevel=ye.VERBOSE,kr=ui.log.bind(ui),e&&vc.set("logging_enabled",!0)):typeof n=="function"?kr=n:(kr=null,vc.remove("logging_enabled"))},$e=function(...n){if(lm===!0&&(lm=!1,kr===null&&vc.get("logging_enabled")===!0&&xg(!0)),kr){const e=Ps.apply(null,n);kr(e)}},As=function(n){return function(...e){$e(n,...e)}},wc=function(...n){const e="FIREBASE INTERNAL ERROR: "+Ps(...n);ui.error(e)},ln=function(...n){const e=`FIREBASE FATAL ERROR: ${Ps(...n)}`;throw ui.error(e),new Error(e)},nt=function(...n){const e="FIREBASE WARNING: "+Ps(...n);ui.warn(e)},gw=function(){typeof window<"u"&&window.location&&window.location.protocol&&window.location.protocol.indexOf("https:")!==-1&&nt("Insecure Firebase access from a secure page. Please use https in calls to new Firebase().")},Sl=function(n){return typeof n=="number"&&(n!==n||n===Number.POSITIVE_INFINITY||n===Number.NEGATIVE_INFINITY)},_w=function(n){if(document.readyState==="complete")n();else{let e=!1;const r=function(){if(!document.body){setTimeout(r,Math.floor(10));return}e||(e=!0,n())};document.addEventListener?(document.addEventListener("DOMContentLoaded",r,!1),window.addEventListener("load",r,!1)):document.attachEvent&&(document.attachEvent("onreadystatechange",()=>{document.readyState==="complete"&&r()}),window.attachEvent("onload",r))}},Yn="[MIN_NAME]",En="[MAX_NAME]",Dr=function(n,e){if(n===e)return 0;if(n===Yn||e===En)return-1;if(e===Yn||n===En)return 1;{const r=am(n),s=am(e);return r!==null?s!==null?r-s===0?n.length-e.length:r-s:-1:s!==null?1:n<e?-1:1}},yw=function(n,e){return n===e?0:n<e?-1:1},ls=function(n,e){if(e&&n in e)return e[n];throw new Error("Missing required key ("+n+") in object: "+Be(e))},$c=function(n){if(typeof n!="object"||n===null)return Be(n);const e=[];for(const s in n)e.push(s);e.sort();let r="{";for(let s=0;s<e.length;s++)s!==0&&(r+=","),r+=Be(e[s]),r+=":",r+=$c(n[e[s]]);return r+="}",r},Ng=function(n,e){const r=n.length;if(r<=e)return[n];const s=[];for(let l=0;l<r;l+=e)l+e>r?s.push(n.substring(l,r)):s.push(n.substring(l,l+e));return s};function qe(n,e){for(const r in n)n.hasOwnProperty(r)&&e(r,n[r])}const Rg=function(n){D(!Sl(n),"Invalid JSON number");const e=11,r=52,s=(1<<e-1)-1;let l,u,d,f,m;n===0?(u=0,d=0,l=1/n===-1/0?1:0):(l=n<0,n=Math.abs(n),n>=Math.pow(2,1-s)?(f=Math.min(Math.floor(Math.log(n)/Math.LN2),s),u=f+s,d=Math.round(n*Math.pow(2,r-f)-Math.pow(2,r))):(u=0,d=Math.round(n/Math.pow(2,1-s-r))));const g=[];for(m=r;m;m-=1)g.push(d%2?1:0),d=Math.floor(d/2);for(m=e;m;m-=1)g.push(u%2?1:0),u=Math.floor(u/2);g.push(l?1:0),g.reverse();const y=g.join("");let w="";for(m=0;m<64;m+=8){let k=parseInt(y.substr(m,8),2).toString(16);k.length===1&&(k="0"+k),w=w+k}return w.toLowerCase()},vw=function(){return!!(typeof window=="object"&&window.chrome&&window.chrome.extension&&!/^chrome/.test(window.location.href))},ww=function(){return typeof Windows=="object"&&typeof Windows.UI=="object"};function kw(n,e){let r="Unknown Error";n==="too_big"?r="The data requested exceeds the maximum size that can be accessed with a single request.":n==="permission_denied"?r="Client doesn't have permission to access the desired data.":n==="unavailable"&&(r="The service is unavailable");const s=new Error(n+" at "+e._path.toString()+": "+r);return s.code=n.toUpperCase(),s}const Cw=new RegExp("^-?(0*)\\d{1,10}$"),Ew=-2147483648,Sw=2147483647,am=function(n){if(Cw.test(n)){const e=Number(n);if(e>=Ew&&e<=Sw)return e}return null},_i=function(n){try{n()}catch(e){setTimeout(()=>{const r=e.stack||"";throw nt("Exception was thrown by user callback.",r),e},Math.floor(0))}},Tw=function(){return(typeof window=="object"&&window.navigator&&window.navigator.userAgent||"").search(/googlebot|google webmaster tools|bingbot|yahoo! slurp|baiduspider|yandexbot|duckduckbot/i)>=0},fs=function(n,e){const r=setTimeout(n,e);return typeof r=="number"&&typeof Deno<"u"&&Deno.unrefTimer?Deno.unrefTimer(r):typeof r=="object"&&r.unref&&r.unref(),r};/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Iw{constructor(e,r){this.appCheckProvider=r,this.appName=e.name,vg(e)&&e.settings.appCheckToken&&(this.serverAppAppCheckToken=e.settings.appCheckToken),this.appCheck=r==null?void 0:r.getImmediate({optional:!0}),this.appCheck||r==null||r.get().then(s=>this.appCheck=s)}getToken(e){if(this.serverAppAppCheckToken){if(e)throw new Error("Attempted reuse of `FirebaseServerApp.appCheckToken` after previous usage failed.");return Promise.resolve({token:this.serverAppAppCheckToken})}return this.appCheck?this.appCheck.getToken(e):new Promise((r,s)=>{setTimeout(()=>{this.appCheck?this.getToken(e).then(r,s):r(null)},0)})}addTokenChangeListener(e){var r;(r=this.appCheckProvider)===null||r===void 0||r.get().then(s=>s.addTokenListener(e))}notifyForInvalidToken(){nt(`Provided AppCheck credentials for the app named "${this.appName}" are invalid. This usually indicates your app was not initialized correctly.`)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xw{constructor(e,r,s){this.appName_=e,this.firebaseOptions_=r,this.authProvider_=s,this.auth_=null,this.auth_=s.getImmediate({optional:!0}),this.auth_||s.onInit(l=>this.auth_=l)}getToken(e){return this.auth_?this.auth_.getToken(e).catch(r=>r&&r.code==="auth/token-not-initialized"?($e("Got auth/token-not-initialized error.  Treating as null token."),null):Promise.reject(r)):new Promise((r,s)=>{setTimeout(()=>{this.auth_?this.getToken(e).then(r,s):r(null)},0)})}addTokenChangeListener(e){this.auth_?this.auth_.addAuthTokenListener(e):this.authProvider_.get().then(r=>r.addAuthTokenListener(e))}removeTokenChangeListener(e){this.authProvider_.get().then(r=>r.removeAuthTokenListener(e))}notifyForInvalidToken(){let e='Provided authentication credentials for the app named "'+this.appName_+'" are invalid. This usually indicates your app was not initialized correctly. ';"credential"in this.firebaseOptions_?e+='Make sure the "credential" property provided to initializeApp() is authorized to access the specified "databaseURL" and is from the correct project.':"serviceAccount"in this.firebaseOptions_?e+='Make sure the "serviceAccount" property provided to initializeApp() is authorized to access the specified "databaseURL" and is from the correct project.':e+='Make sure the "apiKey" and "databaseURL" properties provided to initializeApp() match the values provided for your app at https://console.firebase.google.com/.',nt(e)}}class ci{constructor(e){this.accessToken=e}getToken(e){return Promise.resolve({accessToken:this.accessToken})}addTokenChangeListener(e){e(this.accessToken)}removeTokenChangeListener(e){}notifyForInvalidToken(){}}ci.OWNER="owner";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qc="5",Pg="v",Ag="s",Mg="r",Dg="f",Og=/(console\.firebase|firebase-console-\w+\.corp|firebase\.corp)\.google\.com/,Lg="ls",bg="p",kc="ac",Fg="websocket",Ug="long_polling";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bg{constructor(e,r,s,l,u=!1,d="",f=!1,m=!1,g=null){this.secure=r,this.namespace=s,this.webSocketOnly=l,this.nodeAdmin=u,this.persistenceKey=d,this.includeNamespaceInQueryParams=f,this.isUsingEmulator=m,this.emulatorOptions=g,this._host=e.toLowerCase(),this._domain=this._host.substr(this._host.indexOf(".")+1),this.internalHost=vr.get("host:"+e)||this._host}isCacheableHost(){return this.internalHost.substr(0,2)==="s-"}isCustomHost(){return this._domain!=="firebaseio.com"&&this._domain!=="firebaseio-demo.com"}get host(){return this._host}set host(e){e!==this.internalHost&&(this.internalHost=e,this.isCacheableHost()&&vr.set("host:"+this._host,this.internalHost))}toString(){let e=this.toURLString();return this.persistenceKey&&(e+="<"+this.persistenceKey+">"),e}toURLString(){const e=this.secure?"https://":"http://",r=this.includeNamespaceInQueryParams?`?ns=${this.namespace}`:"";return`${e}${this.host}/${r}`}}function Nw(n){return n.host!==n.internalHost||n.isCustomHost()||n.includeNamespaceInQueryParams}function zg(n,e,r){D(typeof e=="string","typeof type must == string"),D(typeof r=="object","typeof params must == object");let s;if(e===Fg)s=(n.secure?"wss://":"ws://")+n.internalHost+"/.ws?";else if(e===Ug)s=(n.secure?"https://":"http://")+n.internalHost+"/.lp?";else throw new Error("Unknown connection type: "+e);Nw(n)&&(r.ns=n.namespace);const l=[];return qe(r,(u,d)=>{l.push(u+"="+d)}),s+l.join("&")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rw{constructor(){this.counters_={}}incrementCounter(e,r=1){Yt(this.counters_,e)||(this.counters_[e]=0),this.counters_[e]+=r}get(){return B0(this.counters_)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xu={},Zu={};function Kc(n){const e=n.toString();return Xu[e]||(Xu[e]=new Rw),Xu[e]}function Pw(n,e){const r=n.toString();return Zu[r]||(Zu[r]=e()),Zu[r]}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Aw{constructor(e){this.onMessage_=e,this.pendingResponses=[],this.currentResponseNum=0,this.closeAfterResponse=-1,this.onClose=null}closeAfter(e,r){this.closeAfterResponse=e,this.onClose=r,this.closeAfterResponse<this.currentResponseNum&&(this.onClose(),this.onClose=null)}handleResponse(e,r){for(this.pendingResponses[e]=r;this.pendingResponses[this.currentResponseNum];){const s=this.pendingResponses[this.currentResponseNum];delete this.pendingResponses[this.currentResponseNum];for(let l=0;l<s.length;++l)s[l]&&_i(()=>{this.onMessage_(s[l])});if(this.currentResponseNum===this.closeAfterResponse){this.onClose&&(this.onClose(),this.onClose=null);break}this.currentResponseNum++}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const um="start",Mw="close",Dw="pLPCommand",Ow="pRTLPCB",jg="id",Hg="pw",Vg="ser",Lw="cb",bw="seg",Fw="ts",Uw="d",Bw="dframe",Wg=1870,$g=30,zw=Wg-$g,jw=25e3,Hw=3e4;class $n{constructor(e,r,s,l,u,d,f){this.connId=e,this.repoInfo=r,this.applicationId=s,this.appCheckToken=l,this.authToken=u,this.transportSessionId=d,this.lastSessionId=f,this.bytesSent=0,this.bytesReceived=0,this.everConnected_=!1,this.log_=As(e),this.stats_=Kc(r),this.urlFn=m=>(this.appCheckToken&&(m[kc]=this.appCheckToken),zg(r,Ug,m))}open(e,r){this.curSegmentNum=0,this.onDisconnect_=r,this.myPacketOrderer=new Aw(e),this.isClosed_=!1,this.connectTimeoutTimer_=setTimeout(()=>{this.log_("Timed out trying to connect."),this.onClosed_(),this.connectTimeoutTimer_=null},Math.floor(Hw)),_w(()=>{if(this.isClosed_)return;this.scriptTagHolder=new Qc((...u)=>{const[d,f,m,g,y]=u;if(this.incrementIncomingBytes_(u),!!this.scriptTagHolder)if(this.connectTimeoutTimer_&&(clearTimeout(this.connectTimeoutTimer_),this.connectTimeoutTimer_=null),this.everConnected_=!0,d===um)this.id=f,this.password=m;else if(d===Mw)f?(this.scriptTagHolder.sendNewPolls=!1,this.myPacketOrderer.closeAfter(f,()=>{this.onClosed_()})):this.onClosed_();else throw new Error("Unrecognized command received: "+d)},(...u)=>{const[d,f]=u;this.incrementIncomingBytes_(u),this.myPacketOrderer.handleResponse(d,f)},()=>{this.onClosed_()},this.urlFn);const s={};s[um]="t",s[Vg]=Math.floor(Math.random()*1e8),this.scriptTagHolder.uniqueCallbackIdentifier&&(s[Lw]=this.scriptTagHolder.uniqueCallbackIdentifier),s[Pg]=qc,this.transportSessionId&&(s[Ag]=this.transportSessionId),this.lastSessionId&&(s[Lg]=this.lastSessionId),this.applicationId&&(s[bg]=this.applicationId),this.appCheckToken&&(s[kc]=this.appCheckToken),typeof location<"u"&&location.hostname&&Og.test(location.hostname)&&(s[Mg]=Dg);const l=this.urlFn(s);this.log_("Connecting via long-poll to "+l),this.scriptTagHolder.addTag(l,()=>{})})}start(){this.scriptTagHolder.startLongPoll(this.id,this.password),this.addDisconnectPingFrame(this.id,this.password)}static forceAllow(){$n.forceAllow_=!0}static forceDisallow(){$n.forceDisallow_=!0}static isAvailable(){return $n.forceAllow_?!0:!$n.forceDisallow_&&typeof document<"u"&&document.createElement!=null&&!vw()&&!ww()}markConnectionHealthy(){}shutdown_(){this.isClosed_=!0,this.scriptTagHolder&&(this.scriptTagHolder.close(),this.scriptTagHolder=null),this.myDisconnFrame&&(document.body.removeChild(this.myDisconnFrame),this.myDisconnFrame=null),this.connectTimeoutTimer_&&(clearTimeout(this.connectTimeoutTimer_),this.connectTimeoutTimer_=null)}onClosed_(){this.isClosed_||(this.log_("Longpoll is closing itself"),this.shutdown_(),this.onDisconnect_&&(this.onDisconnect_(this.everConnected_),this.onDisconnect_=null))}close(){this.isClosed_||(this.log_("Longpoll is being closed."),this.shutdown_())}send(e){const r=Be(e);this.bytesSent+=r.length,this.stats_.incrementCounter("bytes_sent",r.length);const s=rg(r),l=Ng(s,zw);for(let u=0;u<l.length;u++)this.scriptTagHolder.enqueueSegment(this.curSegmentNum,l.length,l[u]),this.curSegmentNum++}addDisconnectPingFrame(e,r){this.myDisconnFrame=document.createElement("iframe");const s={};s[Bw]="t",s[jg]=e,s[Hg]=r,this.myDisconnFrame.src=this.urlFn(s),this.myDisconnFrame.style.display="none",document.body.appendChild(this.myDisconnFrame)}incrementIncomingBytes_(e){const r=Be(e).length;this.bytesReceived+=r,this.stats_.incrementCounter("bytes_received",r)}}class Qc{constructor(e,r,s,l){this.onDisconnect=s,this.urlFn=l,this.outstandingRequests=new Set,this.pendingSegs=[],this.currentSerial=Math.floor(Math.random()*1e8),this.sendNewPolls=!0;{this.uniqueCallbackIdentifier=Tg(),window[Dw+this.uniqueCallbackIdentifier]=e,window[Ow+this.uniqueCallbackIdentifier]=r,this.myIFrame=Qc.createIFrame_();let u="";this.myIFrame.src&&this.myIFrame.src.substr(0,11)==="javascript:"&&(u='<script>document.domain="'+document.domain+'";<\/script>');const d="<html><body>"+u+"</body></html>";try{this.myIFrame.doc.open(),this.myIFrame.doc.write(d),this.myIFrame.doc.close()}catch(f){$e("frame writing exception"),f.stack&&$e(f.stack),$e(f)}}}static createIFrame_(){const e=document.createElement("iframe");if(e.style.display="none",document.body){document.body.appendChild(e);try{e.contentWindow.document||$e("No IE domain setting required")}catch{const s=document.domain;e.src="javascript:void((function(){document.open();document.domain='"+s+"';document.close();})())"}}else throw"Document body has not initialized. Wait to initialize Firebase until after the document is ready.";return e.contentDocument?e.doc=e.contentDocument:e.contentWindow?e.doc=e.contentWindow.document:e.document&&(e.doc=e.document),e}close(){this.alive=!1,this.myIFrame&&(this.myIFrame.doc.body.textContent="",setTimeout(()=>{this.myIFrame!==null&&(document.body.removeChild(this.myIFrame),this.myIFrame=null)},Math.floor(0)));const e=this.onDisconnect;e&&(this.onDisconnect=null,e())}startLongPoll(e,r){for(this.myID=e,this.myPW=r,this.alive=!0;this.newRequest_(););}newRequest_(){if(this.alive&&this.sendNewPolls&&this.outstandingRequests.size<(this.pendingSegs.length>0?2:1)){this.currentSerial++;const e={};e[jg]=this.myID,e[Hg]=this.myPW,e[Vg]=this.currentSerial;let r=this.urlFn(e),s="",l=0;for(;this.pendingSegs.length>0&&this.pendingSegs[0].d.length+$g+s.length<=Wg;){const d=this.pendingSegs.shift();s=s+"&"+bw+l+"="+d.seg+"&"+Fw+l+"="+d.ts+"&"+Uw+l+"="+d.d,l++}return r=r+s,this.addLongPollTag_(r,this.currentSerial),!0}else return!1}enqueueSegment(e,r,s){this.pendingSegs.push({seg:e,ts:r,d:s}),this.alive&&this.newRequest_()}addLongPollTag_(e,r){this.outstandingRequests.add(r);const s=()=>{this.outstandingRequests.delete(r),this.newRequest_()},l=setTimeout(s,Math.floor(jw)),u=()=>{clearTimeout(l),s()};this.addTag(e,u)}addTag(e,r){setTimeout(()=>{try{if(!this.sendNewPolls)return;const s=this.myIFrame.doc.createElement("script");s.type="text/javascript",s.async=!0,s.src=e,s.onload=s.onreadystatechange=function(){const l=s.readyState;(!l||l==="loaded"||l==="complete")&&(s.onload=s.onreadystatechange=null,s.parentNode&&s.parentNode.removeChild(s),r())},s.onerror=()=>{$e("Long-poll script failed to load: "+e),this.sendNewPolls=!1,this.close()},this.myIFrame.doc.body.appendChild(s)}catch{}},Math.floor(1))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Vw=16384,Ww=45e3;let ll=null;typeof MozWebSocket<"u"?ll=MozWebSocket:typeof WebSocket<"u"&&(ll=WebSocket);class Mt{constructor(e,r,s,l,u,d,f){this.connId=e,this.applicationId=s,this.appCheckToken=l,this.authToken=u,this.keepaliveTimer=null,this.frames=null,this.totalFrames=0,this.bytesSent=0,this.bytesReceived=0,this.log_=As(this.connId),this.stats_=Kc(r),this.connURL=Mt.connectionURL_(r,d,f,l,s),this.nodeAdmin=r.nodeAdmin}static connectionURL_(e,r,s,l,u){const d={};return d[Pg]=qc,typeof location<"u"&&location.hostname&&Og.test(location.hostname)&&(d[Mg]=Dg),r&&(d[Ag]=r),s&&(d[Lg]=s),l&&(d[kc]=l),u&&(d[bg]=u),zg(e,Fg,d)}open(e,r){this.onDisconnect=r,this.onMessage=e,this.log_("Websocket connecting to "+this.connURL),this.everConnected_=!1,vr.set("previous_websocket_failure",!0);try{let s;Y0(),this.mySock=new ll(this.connURL,[],s)}catch(s){this.log_("Error instantiating WebSocket.");const l=s.message||s.data;l&&this.log_(l),this.onClosed_();return}this.mySock.onopen=()=>{this.log_("Websocket connected."),this.everConnected_=!0},this.mySock.onclose=()=>{this.log_("Websocket connection was disconnected."),this.mySock=null,this.onClosed_()},this.mySock.onmessage=s=>{this.handleIncomingFrame(s)},this.mySock.onerror=s=>{this.log_("WebSocket error.  Closing connection.");const l=s.message||s.data;l&&this.log_(l),this.onClosed_()}}start(){}static forceDisallow(){Mt.forceDisallow_=!0}static isAvailable(){let e=!1;if(typeof navigator<"u"&&navigator.userAgent){const r=/Android ([0-9]{0,}\.[0-9]{0,})/,s=navigator.userAgent.match(r);s&&s.length>1&&parseFloat(s[1])<4.4&&(e=!0)}return!e&&ll!==null&&!Mt.forceDisallow_}static previouslyFailed(){return vr.isInMemoryStorage||vr.get("previous_websocket_failure")===!0}markConnectionHealthy(){vr.remove("previous_websocket_failure")}appendFrame_(e){if(this.frames.push(e),this.frames.length===this.totalFrames){const r=this.frames.join("");this.frames=null;const s=ys(r);this.onMessage(s)}}handleNewFrameCount_(e){this.totalFrames=e,this.frames=[]}extractFrameCount_(e){if(D(this.frames===null,"We already have a frame buffer"),e.length<=6){const r=Number(e);if(!isNaN(r))return this.handleNewFrameCount_(r),null}return this.handleNewFrameCount_(1),e}handleIncomingFrame(e){if(this.mySock===null)return;const r=e.data;if(this.bytesReceived+=r.length,this.stats_.incrementCounter("bytes_received",r.length),this.resetKeepAlive(),this.frames!==null)this.appendFrame_(r);else{const s=this.extractFrameCount_(r);s!==null&&this.appendFrame_(s)}}send(e){this.resetKeepAlive();const r=Be(e);this.bytesSent+=r.length,this.stats_.incrementCounter("bytes_sent",r.length);const s=Ng(r,Vw);s.length>1&&this.sendString_(String(s.length));for(let l=0;l<s.length;l++)this.sendString_(s[l])}shutdown_(){this.isClosed_=!0,this.keepaliveTimer&&(clearInterval(this.keepaliveTimer),this.keepaliveTimer=null),this.mySock&&(this.mySock.close(),this.mySock=null)}onClosed_(){this.isClosed_||(this.log_("WebSocket is closing itself"),this.shutdown_(),this.onDisconnect&&(this.onDisconnect(this.everConnected_),this.onDisconnect=null))}close(){this.isClosed_||(this.log_("WebSocket is being closed"),this.shutdown_())}resetKeepAlive(){clearInterval(this.keepaliveTimer),this.keepaliveTimer=setInterval(()=>{this.mySock&&this.sendString_("0"),this.resetKeepAlive()},Math.floor(Ww))}sendString_(e){try{this.mySock.send(e)}catch(r){this.log_("Exception thrown from WebSocket.send():",r.message||r.data,"Closing connection."),setTimeout(this.onClosed_.bind(this),0)}}}Mt.responsesRequiredToBeHealthy=2;Mt.healthyTimeout=3e4;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class di{static get ALL_TRANSPORTS(){return[$n,Mt]}static get IS_TRANSPORT_INITIALIZED(){return this.globalTransportInitialized_}constructor(e){this.initTransports_(e)}initTransports_(e){const r=Mt&&Mt.isAvailable();let s=r&&!Mt.previouslyFailed();if(e.webSocketOnly&&(r||nt("wss:// URL used, but browser isn't known to support websockets.  Trying anyway."),s=!0),s)this.transports_=[Mt];else{const l=this.transports_=[];for(const u of di.ALL_TRANSPORTS)u&&u.isAvailable()&&l.push(u);di.globalTransportInitialized_=!0}}initialTransport(){if(this.transports_.length>0)return this.transports_[0];throw new Error("No transports available")}upgradeTransport(){return this.transports_.length>1?this.transports_[1]:null}}di.globalTransportInitialized_=!1;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $w=6e4,qw=5e3,Kw=10*1024,Qw=100*1024,Ju="t",cm="d",Gw="s",dm="r",Yw="e",hm="o",fm="a",pm="n",mm="p",Xw="h";class Zw{constructor(e,r,s,l,u,d,f,m,g,y){this.id=e,this.repoInfo_=r,this.applicationId_=s,this.appCheckToken_=l,this.authToken_=u,this.onMessage_=d,this.onReady_=f,this.onDisconnect_=m,this.onKill_=g,this.lastSessionId=y,this.connectionCount=0,this.pendingDataMessages=[],this.state_=0,this.log_=As("c:"+this.id+":"),this.transportManager_=new di(r),this.log_("Connection created"),this.start_()}start_(){const e=this.transportManager_.initialTransport();this.conn_=new e(this.nextTransportId_(),this.repoInfo_,this.applicationId_,this.appCheckToken_,this.authToken_,null,this.lastSessionId),this.primaryResponsesRequired_=e.responsesRequiredToBeHealthy||0;const r=this.connReceiver_(this.conn_),s=this.disconnReceiver_(this.conn_);this.tx_=this.conn_,this.rx_=this.conn_,this.secondaryConn_=null,this.isHealthy_=!1,setTimeout(()=>{this.conn_&&this.conn_.open(r,s)},Math.floor(0));const l=e.healthyTimeout||0;l>0&&(this.healthyTimeout_=fs(()=>{this.healthyTimeout_=null,this.isHealthy_||(this.conn_&&this.conn_.bytesReceived>Qw?(this.log_("Connection exceeded healthy timeout but has received "+this.conn_.bytesReceived+" bytes.  Marking connection healthy."),this.isHealthy_=!0,this.conn_.markConnectionHealthy()):this.conn_&&this.conn_.bytesSent>Kw?this.log_("Connection exceeded healthy timeout but has sent "+this.conn_.bytesSent+" bytes.  Leaving connection alive."):(this.log_("Closing unhealthy connection after timeout."),this.close()))},Math.floor(l)))}nextTransportId_(){return"c:"+this.id+":"+this.connectionCount++}disconnReceiver_(e){return r=>{e===this.conn_?this.onConnectionLost_(r):e===this.secondaryConn_?(this.log_("Secondary connection lost."),this.onSecondaryConnectionLost_()):this.log_("closing an old connection")}}connReceiver_(e){return r=>{this.state_!==2&&(e===this.rx_?this.onPrimaryMessageReceived_(r):e===this.secondaryConn_?this.onSecondaryMessageReceived_(r):this.log_("message on old connection"))}}sendRequest(e){const r={t:"d",d:e};this.sendData_(r)}tryCleanupConnection(){this.tx_===this.secondaryConn_&&this.rx_===this.secondaryConn_&&(this.log_("cleaning up and promoting a connection: "+this.secondaryConn_.connId),this.conn_=this.secondaryConn_,this.secondaryConn_=null)}onSecondaryControl_(e){if(Ju in e){const r=e[Ju];r===fm?this.upgradeIfSecondaryHealthy_():r===dm?(this.log_("Got a reset on secondary, closing it"),this.secondaryConn_.close(),(this.tx_===this.secondaryConn_||this.rx_===this.secondaryConn_)&&this.close()):r===hm&&(this.log_("got pong on secondary."),this.secondaryResponsesRequired_--,this.upgradeIfSecondaryHealthy_())}}onSecondaryMessageReceived_(e){const r=ls("t",e),s=ls("d",e);if(r==="c")this.onSecondaryControl_(s);else if(r==="d")this.pendingDataMessages.push(s);else throw new Error("Unknown protocol layer: "+r)}upgradeIfSecondaryHealthy_(){this.secondaryResponsesRequired_<=0?(this.log_("Secondary connection is healthy."),this.isHealthy_=!0,this.secondaryConn_.markConnectionHealthy(),this.proceedWithUpgrade_()):(this.log_("sending ping on secondary."),this.secondaryConn_.send({t:"c",d:{t:mm,d:{}}}))}proceedWithUpgrade_(){this.secondaryConn_.start(),this.log_("sending client ack on secondary"),this.secondaryConn_.send({t:"c",d:{t:fm,d:{}}}),this.log_("Ending transmission on primary"),this.conn_.send({t:"c",d:{t:pm,d:{}}}),this.tx_=this.secondaryConn_,this.tryCleanupConnection()}onPrimaryMessageReceived_(e){const r=ls("t",e),s=ls("d",e);r==="c"?this.onControl_(s):r==="d"&&this.onDataMessage_(s)}onDataMessage_(e){this.onPrimaryResponse_(),this.onMessage_(e)}onPrimaryResponse_(){this.isHealthy_||(this.primaryResponsesRequired_--,this.primaryResponsesRequired_<=0&&(this.log_("Primary connection is healthy."),this.isHealthy_=!0,this.conn_.markConnectionHealthy()))}onControl_(e){const r=ls(Ju,e);if(cm in e){const s=e[cm];if(r===Xw){const l=Object.assign({},s);this.repoInfo_.isUsingEmulator&&(l.h=this.repoInfo_.host),this.onHandshake_(l)}else if(r===pm){this.log_("recvd end transmission on primary"),this.rx_=this.secondaryConn_;for(let l=0;l<this.pendingDataMessages.length;++l)this.onDataMessage_(this.pendingDataMessages[l]);this.pendingDataMessages=[],this.tryCleanupConnection()}else r===Gw?this.onConnectionShutdown_(s):r===dm?this.onReset_(s):r===Yw?wc("Server Error: "+s):r===hm?(this.log_("got pong on primary."),this.onPrimaryResponse_(),this.sendPingOnPrimaryIfNecessary_()):wc("Unknown control packet command: "+r)}}onHandshake_(e){const r=e.ts,s=e.v,l=e.h;this.sessionId=e.s,this.repoInfo_.host=l,this.state_===0&&(this.conn_.start(),this.onConnectionEstablished_(this.conn_,r),qc!==s&&nt("Protocol version mismatch detected"),this.tryStartUpgrade_())}tryStartUpgrade_(){const e=this.transportManager_.upgradeTransport();e&&this.startUpgrade_(e)}startUpgrade_(e){this.secondaryConn_=new e(this.nextTransportId_(),this.repoInfo_,this.applicationId_,this.appCheckToken_,this.authToken_,this.sessionId),this.secondaryResponsesRequired_=e.responsesRequiredToBeHealthy||0;const r=this.connReceiver_(this.secondaryConn_),s=this.disconnReceiver_(this.secondaryConn_);this.secondaryConn_.open(r,s),fs(()=>{this.secondaryConn_&&(this.log_("Timed out trying to upgrade."),this.secondaryConn_.close())},Math.floor($w))}onReset_(e){this.log_("Reset packet received.  New host: "+e),this.repoInfo_.host=e,this.state_===1?this.close():(this.closeConnections_(),this.start_())}onConnectionEstablished_(e,r){this.log_("Realtime connection established."),this.conn_=e,this.state_=1,this.onReady_&&(this.onReady_(r,this.sessionId),this.onReady_=null),this.primaryResponsesRequired_===0?(this.log_("Primary connection is healthy."),this.isHealthy_=!0):fs(()=>{this.sendPingOnPrimaryIfNecessary_()},Math.floor(qw))}sendPingOnPrimaryIfNecessary_(){!this.isHealthy_&&this.state_===1&&(this.log_("sending ping on primary."),this.sendData_({t:"c",d:{t:mm,d:{}}}))}onSecondaryConnectionLost_(){const e=this.secondaryConn_;this.secondaryConn_=null,(this.tx_===e||this.rx_===e)&&this.close()}onConnectionLost_(e){this.conn_=null,!e&&this.state_===0?(this.log_("Realtime connection failed."),this.repoInfo_.isCacheableHost()&&(vr.remove("host:"+this.repoInfo_.host),this.repoInfo_.internalHost=this.repoInfo_.host)):this.state_===1&&this.log_("Realtime connection lost."),this.close()}onConnectionShutdown_(e){this.log_("Connection shutdown command received. Shutting down..."),this.onKill_&&(this.onKill_(e),this.onKill_=null),this.onDisconnect_=null,this.close()}sendData_(e){if(this.state_!==1)throw"Connection is not connected";this.tx_.send(e)}close(){this.state_!==2&&(this.log_("Closing realtime connection."),this.state_=2,this.closeConnections_(),this.onDisconnect_&&(this.onDisconnect_(),this.onDisconnect_=null))}closeConnections_(){this.log_("Shutting down all connections"),this.conn_&&(this.conn_.close(),this.conn_=null),this.secondaryConn_&&(this.secondaryConn_.close(),this.secondaryConn_=null),this.healthyTimeout_&&(clearTimeout(this.healthyTimeout_),this.healthyTimeout_=null)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qg{put(e,r,s,l){}merge(e,r,s,l){}refreshAuthToken(e){}refreshAppCheckToken(e){}onDisconnectPut(e,r,s){}onDisconnectMerge(e,r,s){}onDisconnectCancel(e,r){}reportStats(e){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Kg{constructor(e){this.allowedEvents_=e,this.listeners_={},D(Array.isArray(e)&&e.length>0,"Requires a non-empty array")}trigger(e,...r){if(Array.isArray(this.listeners_[e])){const s=[...this.listeners_[e]];for(let l=0;l<s.length;l++)s[l].callback.apply(s[l].context,r)}}on(e,r,s){this.validateEventType_(e),this.listeners_[e]=this.listeners_[e]||[],this.listeners_[e].push({callback:r,context:s});const l=this.getInitialEvent(e);l&&r.apply(s,l)}off(e,r,s){this.validateEventType_(e);const l=this.listeners_[e]||[];for(let u=0;u<l.length;u++)if(l[u].callback===r&&(!s||s===l[u].context)){l.splice(u,1);return}}validateEventType_(e){D(this.allowedEvents_.find(r=>r===e),"Unknown event: "+e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class al extends Kg{static getInstance(){return new al}constructor(){super(["online"]),this.online_=!0,typeof window<"u"&&typeof window.addEventListener<"u"&&!dg()&&(window.addEventListener("online",()=>{this.online_||(this.online_=!0,this.trigger("online",!0))},!1),window.addEventListener("offline",()=>{this.online_&&(this.online_=!1,this.trigger("online",!1))},!1))}getInitialEvent(e){return D(e==="online","Unknown event type: "+e),[this.online_]}currentlyOnline(){return this.online_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gm=32,_m=768;class ue{constructor(e,r){if(r===void 0){this.pieces_=e.split("/");let s=0;for(let l=0;l<this.pieces_.length;l++)this.pieces_[l].length>0&&(this.pieces_[s]=this.pieces_[l],s++);this.pieces_.length=s,this.pieceNum_=0}else this.pieces_=e,this.pieceNum_=r}toString(){let e="";for(let r=this.pieceNum_;r<this.pieces_.length;r++)this.pieces_[r]!==""&&(e+="/"+this.pieces_[r]);return e||"/"}}function le(){return new ue("")}function X(n){return n.pieceNum_>=n.pieces_.length?null:n.pieces_[n.pieceNum_]}function Xn(n){return n.pieces_.length-n.pieceNum_}function fe(n){let e=n.pieceNum_;return e<n.pieces_.length&&e++,new ue(n.pieces_,e)}function Gc(n){return n.pieceNum_<n.pieces_.length?n.pieces_[n.pieces_.length-1]:null}function Jw(n){let e="";for(let r=n.pieceNum_;r<n.pieces_.length;r++)n.pieces_[r]!==""&&(e+="/"+encodeURIComponent(String(n.pieces_[r])));return e||"/"}function ws(n,e=0){return n.pieces_.slice(n.pieceNum_+e)}function Qg(n){if(n.pieceNum_>=n.pieces_.length)return null;const e=[];for(let r=n.pieceNum_;r<n.pieces_.length-1;r++)e.push(n.pieces_[r]);return new ue(e,0)}function Se(n,e){const r=[];for(let s=n.pieceNum_;s<n.pieces_.length;s++)r.push(n.pieces_[s]);if(e instanceof ue)for(let s=e.pieceNum_;s<e.pieces_.length;s++)r.push(e.pieces_[s]);else{const s=e.split("/");for(let l=0;l<s.length;l++)s[l].length>0&&r.push(s[l])}return new ue(r,0)}function Z(n){return n.pieceNum_>=n.pieces_.length}function lt(n,e){const r=X(n),s=X(e);if(r===null)return e;if(r===s)return lt(fe(n),fe(e));throw new Error("INTERNAL ERROR: innerPath ("+e+") is not within outerPath ("+n+")")}function e2(n,e){const r=ws(n,0),s=ws(e,0);for(let l=0;l<r.length&&l<s.length;l++){const u=Dr(r[l],s[l]);if(u!==0)return u}return r.length===s.length?0:r.length<s.length?-1:1}function Yc(n,e){if(Xn(n)!==Xn(e))return!1;for(let r=n.pieceNum_,s=e.pieceNum_;r<=n.pieces_.length;r++,s++)if(n.pieces_[r]!==e.pieces_[s])return!1;return!0}function Dt(n,e){let r=n.pieceNum_,s=e.pieceNum_;if(Xn(n)>Xn(e))return!1;for(;r<n.pieces_.length;){if(n.pieces_[r]!==e.pieces_[s])return!1;++r,++s}return!0}class t2{constructor(e,r){this.errorPrefix_=r,this.parts_=ws(e,0),this.byteLength_=Math.max(1,this.parts_.length);for(let s=0;s<this.parts_.length;s++)this.byteLength_+=Cl(this.parts_[s]);Gg(this)}}function n2(n,e){n.parts_.length>0&&(n.byteLength_+=1),n.parts_.push(e),n.byteLength_+=Cl(e),Gg(n)}function r2(n){const e=n.parts_.pop();n.byteLength_-=Cl(e),n.parts_.length>0&&(n.byteLength_-=1)}function Gg(n){if(n.byteLength_>_m)throw new Error(n.errorPrefix_+"has a key path longer than "+_m+" bytes ("+n.byteLength_+").");if(n.parts_.length>gm)throw new Error(n.errorPrefix_+"path specified exceeds the maximum depth that can be written ("+gm+") or object contains a cycle "+yr(n))}function yr(n){return n.parts_.length===0?"":"in property '"+n.parts_.join(".")+"'"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xc extends Kg{static getInstance(){return new Xc}constructor(){super(["visible"]);let e,r;typeof document<"u"&&typeof document.addEventListener<"u"&&(typeof document.hidden<"u"?(r="visibilitychange",e="hidden"):typeof document.mozHidden<"u"?(r="mozvisibilitychange",e="mozHidden"):typeof document.msHidden<"u"?(r="msvisibilitychange",e="msHidden"):typeof document.webkitHidden<"u"&&(r="webkitvisibilitychange",e="webkitHidden")),this.visible_=!0,r&&document.addEventListener(r,()=>{const s=!document[e];s!==this.visible_&&(this.visible_=s,this.trigger("visible",s))},!1)}getInitialEvent(e){return D(e==="visible","Unknown event type: "+e),[this.visible_]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const as=1e3,i2=300*1e3,ym=30*1e3,s2=1.3,o2=3e4,l2="server_kill",vm=3;class Lt extends qg{constructor(e,r,s,l,u,d,f,m){if(super(),this.repoInfo_=e,this.applicationId_=r,this.onDataUpdate_=s,this.onConnectStatus_=l,this.onServerInfoUpdate_=u,this.authTokenProvider_=d,this.appCheckTokenProvider_=f,this.authOverride_=m,this.id=Lt.nextPersistentConnectionId_++,this.log_=As("p:"+this.id+":"),this.interruptReasons_={},this.listens=new Map,this.outstandingPuts_=[],this.outstandingGets_=[],this.outstandingPutCount_=0,this.outstandingGetCount_=0,this.onDisconnectRequestQueue_=[],this.connected_=!1,this.reconnectDelay_=as,this.maxReconnectDelay_=i2,this.securityDebugCallback_=null,this.lastSessionId=null,this.establishConnectionTimer_=null,this.visible_=!1,this.requestCBHash_={},this.requestNumber_=0,this.realtime_=null,this.authToken_=null,this.appCheckToken_=null,this.forceTokenRefresh_=!1,this.invalidAuthTokenCount_=0,this.invalidAppCheckTokenCount_=0,this.firstConnection_=!0,this.lastConnectionAttemptTime_=null,this.lastConnectionEstablishedTime_=null,m)throw new Error("Auth override specified in options, but not supported on non Node.js platforms");Xc.getInstance().on("visible",this.onVisible_,this),e.host.indexOf("fblocal")===-1&&al.getInstance().on("online",this.onOnline_,this)}sendRequest(e,r,s){const l=++this.requestNumber_,u={r:l,a:e,b:r};this.log_(Be(u)),D(this.connected_,"sendRequest call when we're not connected not allowed."),this.realtime_.sendRequest(u),s&&(this.requestCBHash_[l]=s)}get(e){this.initConnection_();const r=new St,l={action:"g",request:{p:e._path.toString(),q:e._queryObject},onComplete:d=>{const f=d.d;d.s==="ok"?r.resolve(f):r.reject(f)}};this.outstandingGets_.push(l),this.outstandingGetCount_++;const u=this.outstandingGets_.length-1;return this.connected_&&this.sendGet_(u),r.promise}listen(e,r,s,l){this.initConnection_();const u=e._queryIdentifier,d=e._path.toString();this.log_("Listen called for "+d+" "+u),this.listens.has(d)||this.listens.set(d,new Map),D(e._queryParams.isDefault()||!e._queryParams.loadsAllData(),"listen() called for non-default but complete query"),D(!this.listens.get(d).has(u),"listen() called twice for same path/queryId.");const f={onComplete:l,hashFn:r,query:e,tag:s};this.listens.get(d).set(u,f),this.connected_&&this.sendListen_(f)}sendGet_(e){const r=this.outstandingGets_[e];this.sendRequest("g",r.request,s=>{delete this.outstandingGets_[e],this.outstandingGetCount_--,this.outstandingGetCount_===0&&(this.outstandingGets_=[]),r.onComplete&&r.onComplete(s)})}sendListen_(e){const r=e.query,s=r._path.toString(),l=r._queryIdentifier;this.log_("Listen on "+s+" for "+l);const u={p:s},d="q";e.tag&&(u.q=r._queryObject,u.t=e.tag),u.h=e.hashFn(),this.sendRequest(d,u,f=>{const m=f.d,g=f.s;Lt.warnOnListenWarnings_(m,r),(this.listens.get(s)&&this.listens.get(s).get(l))===e&&(this.log_("listen response",f),g!=="ok"&&this.removeListen_(s,l),e.onComplete&&e.onComplete(g,m))})}static warnOnListenWarnings_(e,r){if(e&&typeof e=="object"&&Yt(e,"w")){const s=Er(e,"w");if(Array.isArray(s)&&~s.indexOf("no_index")){const l='".indexOn": "'+r._queryParams.getIndex().toString()+'"',u=r._path.toString();nt(`Using an unspecified index. Your data will be downloaded and filtered on the client. Consider adding ${l} at ${u} to your security rules for better performance.`)}}}refreshAuthToken(e){this.authToken_=e,this.log_("Auth token refreshed"),this.authToken_?this.tryAuth():this.connected_&&this.sendRequest("unauth",{},()=>{}),this.reduceReconnectDelayIfAdminCredential_(e)}reduceReconnectDelayIfAdminCredential_(e){(e&&e.length===40||nv(e))&&(this.log_("Admin auth credential detected.  Reducing max reconnect time."),this.maxReconnectDelay_=ym)}refreshAppCheckToken(e){this.appCheckToken_=e,this.log_("App check token refreshed"),this.appCheckToken_?this.tryAppCheck():this.connected_&&this.sendRequest("unappeck",{},()=>{})}tryAuth(){if(this.connected_&&this.authToken_){const e=this.authToken_,r=tv(e)?"auth":"gauth",s={cred:e};this.authOverride_===null?s.noauth=!0:typeof this.authOverride_=="object"&&(s.authvar=this.authOverride_),this.sendRequest(r,s,l=>{const u=l.s,d=l.d||"error";this.authToken_===e&&(u==="ok"?this.invalidAuthTokenCount_=0:this.onAuthRevoked_(u,d))})}}tryAppCheck(){this.connected_&&this.appCheckToken_&&this.sendRequest("appcheck",{token:this.appCheckToken_},e=>{const r=e.s,s=e.d||"error";r==="ok"?this.invalidAppCheckTokenCount_=0:this.onAppCheckRevoked_(r,s)})}unlisten(e,r){const s=e._path.toString(),l=e._queryIdentifier;this.log_("Unlisten called for "+s+" "+l),D(e._queryParams.isDefault()||!e._queryParams.loadsAllData(),"unlisten() called for non-default but complete query"),this.removeListen_(s,l)&&this.connected_&&this.sendUnlisten_(s,l,e._queryObject,r)}sendUnlisten_(e,r,s,l){this.log_("Unlisten on "+e+" for "+r);const u={p:e},d="n";l&&(u.q=s,u.t=l),this.sendRequest(d,u)}onDisconnectPut(e,r,s){this.initConnection_(),this.connected_?this.sendOnDisconnect_("o",e,r,s):this.onDisconnectRequestQueue_.push({pathString:e,action:"o",data:r,onComplete:s})}onDisconnectMerge(e,r,s){this.initConnection_(),this.connected_?this.sendOnDisconnect_("om",e,r,s):this.onDisconnectRequestQueue_.push({pathString:e,action:"om",data:r,onComplete:s})}onDisconnectCancel(e,r){this.initConnection_(),this.connected_?this.sendOnDisconnect_("oc",e,null,r):this.onDisconnectRequestQueue_.push({pathString:e,action:"oc",data:null,onComplete:r})}sendOnDisconnect_(e,r,s,l){const u={p:r,d:s};this.log_("onDisconnect "+e,u),this.sendRequest(e,u,d=>{l&&setTimeout(()=>{l(d.s,d.d)},Math.floor(0))})}put(e,r,s,l){this.putInternal("p",e,r,s,l)}merge(e,r,s,l){this.putInternal("m",e,r,s,l)}putInternal(e,r,s,l,u){this.initConnection_();const d={p:r,d:s};u!==void 0&&(d.h=u),this.outstandingPuts_.push({action:e,request:d,onComplete:l}),this.outstandingPutCount_++;const f=this.outstandingPuts_.length-1;this.connected_?this.sendPut_(f):this.log_("Buffering put: "+r)}sendPut_(e){const r=this.outstandingPuts_[e].action,s=this.outstandingPuts_[e].request,l=this.outstandingPuts_[e].onComplete;this.outstandingPuts_[e].queued=this.connected_,this.sendRequest(r,s,u=>{this.log_(r+" response",u),delete this.outstandingPuts_[e],this.outstandingPutCount_--,this.outstandingPutCount_===0&&(this.outstandingPuts_=[]),l&&l(u.s,u.d)})}reportStats(e){if(this.connected_){const r={c:e};this.log_("reportStats",r),this.sendRequest("s",r,s=>{if(s.s!=="ok"){const u=s.d;this.log_("reportStats","Error sending stats: "+u)}})}}onDataMessage_(e){if("r"in e){this.log_("from server: "+Be(e));const r=e.r,s=this.requestCBHash_[r];s&&(delete this.requestCBHash_[r],s(e.b))}else{if("error"in e)throw"A server-side error has occurred: "+e.error;"a"in e&&this.onDataPush_(e.a,e.b)}}onDataPush_(e,r){this.log_("handleServerMessage",e,r),e==="d"?this.onDataUpdate_(r.p,r.d,!1,r.t):e==="m"?this.onDataUpdate_(r.p,r.d,!0,r.t):e==="c"?this.onListenRevoked_(r.p,r.q):e==="ac"?this.onAuthRevoked_(r.s,r.d):e==="apc"?this.onAppCheckRevoked_(r.s,r.d):e==="sd"?this.onSecurityDebugPacket_(r):wc("Unrecognized action received from server: "+Be(e)+`
Are you using the latest client?`)}onReady_(e,r){this.log_("connection ready"),this.connected_=!0,this.lastConnectionEstablishedTime_=new Date().getTime(),this.handleTimestamp_(e),this.lastSessionId=r,this.firstConnection_&&this.sendConnectStats_(),this.restoreState_(),this.firstConnection_=!1,this.onConnectStatus_(!0)}scheduleConnect_(e){D(!this.realtime_,"Scheduling a connect when we're already connected/ing?"),this.establishConnectionTimer_&&clearTimeout(this.establishConnectionTimer_),this.establishConnectionTimer_=setTimeout(()=>{this.establishConnectionTimer_=null,this.establishConnection_()},Math.floor(e))}initConnection_(){!this.realtime_&&this.firstConnection_&&this.scheduleConnect_(0)}onVisible_(e){e&&!this.visible_&&this.reconnectDelay_===this.maxReconnectDelay_&&(this.log_("Window became visible.  Reducing delay."),this.reconnectDelay_=as,this.realtime_||this.scheduleConnect_(0)),this.visible_=e}onOnline_(e){e?(this.log_("Browser went online."),this.reconnectDelay_=as,this.realtime_||this.scheduleConnect_(0)):(this.log_("Browser went offline.  Killing connection."),this.realtime_&&this.realtime_.close())}onRealtimeDisconnect_(){if(this.log_("data client disconnected"),this.connected_=!1,this.realtime_=null,this.cancelSentTransactions_(),this.requestCBHash_={},this.shouldReconnect_()){this.visible_?this.lastConnectionEstablishedTime_&&(new Date().getTime()-this.lastConnectionEstablishedTime_>o2&&(this.reconnectDelay_=as),this.lastConnectionEstablishedTime_=null):(this.log_("Window isn't visible.  Delaying reconnect."),this.reconnectDelay_=this.maxReconnectDelay_,this.lastConnectionAttemptTime_=new Date().getTime());const e=Math.max(0,new Date().getTime()-this.lastConnectionAttemptTime_);let r=Math.max(0,this.reconnectDelay_-e);r=Math.random()*r,this.log_("Trying to reconnect in "+r+"ms"),this.scheduleConnect_(r),this.reconnectDelay_=Math.min(this.maxReconnectDelay_,this.reconnectDelay_*s2)}this.onConnectStatus_(!1)}async establishConnection_(){if(this.shouldReconnect_()){this.log_("Making a connection attempt"),this.lastConnectionAttemptTime_=new Date().getTime(),this.lastConnectionEstablishedTime_=null;const e=this.onDataMessage_.bind(this),r=this.onReady_.bind(this),s=this.onRealtimeDisconnect_.bind(this),l=this.id+":"+Lt.nextConnectionId_++,u=this.lastSessionId;let d=!1,f=null;const m=function(){f?f.close():(d=!0,s())},g=function(w){D(f,"sendRequest call when we're not connected not allowed."),f.sendRequest(w)};this.realtime_={close:m,sendRequest:g};const y=this.forceTokenRefresh_;this.forceTokenRefresh_=!1;try{const[w,k]=await Promise.all([this.authTokenProvider_.getToken(y),this.appCheckTokenProvider_.getToken(y)]);d?$e("getToken() completed but was canceled"):($e("getToken() completed. Creating connection."),this.authToken_=w&&w.accessToken,this.appCheckToken_=k&&k.token,f=new Zw(l,this.repoInfo_,this.applicationId_,this.appCheckToken_,this.authToken_,e,r,s,P=>{nt(P+" ("+this.repoInfo_.toString()+")"),this.interrupt(l2)},u))}catch(w){this.log_("Failed to get token: "+w),d||(this.repoInfo_.nodeAdmin&&nt(w),m())}}}interrupt(e){$e("Interrupting connection for reason: "+e),this.interruptReasons_[e]=!0,this.realtime_?this.realtime_.close():(this.establishConnectionTimer_&&(clearTimeout(this.establishConnectionTimer_),this.establishConnectionTimer_=null),this.connected_&&this.onRealtimeDisconnect_())}resume(e){$e("Resuming connection for reason: "+e),delete this.interruptReasons_[e],hc(this.interruptReasons_)&&(this.reconnectDelay_=as,this.realtime_||this.scheduleConnect_(0))}handleTimestamp_(e){const r=e-new Date().getTime();this.onServerInfoUpdate_({serverTimeOffset:r})}cancelSentTransactions_(){for(let e=0;e<this.outstandingPuts_.length;e++){const r=this.outstandingPuts_[e];r&&"h"in r.request&&r.queued&&(r.onComplete&&r.onComplete("disconnect"),delete this.outstandingPuts_[e],this.outstandingPutCount_--)}this.outstandingPutCount_===0&&(this.outstandingPuts_=[])}onListenRevoked_(e,r){let s;r?s=r.map(u=>$c(u)).join("$"):s="default";const l=this.removeListen_(e,s);l&&l.onComplete&&l.onComplete("permission_denied")}removeListen_(e,r){const s=new ue(e).toString();let l;if(this.listens.has(s)){const u=this.listens.get(s);l=u.get(r),u.delete(r),u.size===0&&this.listens.delete(s)}else l=void 0;return l}onAuthRevoked_(e,r){$e("Auth token revoked: "+e+"/"+r),this.authToken_=null,this.forceTokenRefresh_=!0,this.realtime_.close(),(e==="invalid_token"||e==="permission_denied")&&(this.invalidAuthTokenCount_++,this.invalidAuthTokenCount_>=vm&&(this.reconnectDelay_=ym,this.authTokenProvider_.notifyForInvalidToken()))}onAppCheckRevoked_(e,r){$e("App check token revoked: "+e+"/"+r),this.appCheckToken_=null,this.forceTokenRefresh_=!0,(e==="invalid_token"||e==="permission_denied")&&(this.invalidAppCheckTokenCount_++,this.invalidAppCheckTokenCount_>=vm&&this.appCheckTokenProvider_.notifyForInvalidToken())}onSecurityDebugPacket_(e){this.securityDebugCallback_?this.securityDebugCallback_(e):"msg"in e&&console.log("FIREBASE: "+e.msg.replace(`
`,`
FIREBASE: `))}restoreState_(){this.tryAuth(),this.tryAppCheck();for(const e of this.listens.values())for(const r of e.values())this.sendListen_(r);for(let e=0;e<this.outstandingPuts_.length;e++)this.outstandingPuts_[e]&&this.sendPut_(e);for(;this.onDisconnectRequestQueue_.length;){const e=this.onDisconnectRequestQueue_.shift();this.sendOnDisconnect_(e.action,e.pathString,e.data,e.onComplete)}for(let e=0;e<this.outstandingGets_.length;e++)this.outstandingGets_[e]&&this.sendGet_(e)}sendConnectStats_(){const e={};let r="js";e["sdk."+r+"."+Eg.replace(/\./g,"-")]=1,dg()?e["framework.cordova"]=1:G0()&&(e["framework.reactnative"]=1),this.reportStats(e)}shouldReconnect_(){const e=al.getInstance().currentlyOnline();return hc(this.interruptReasons_)&&e}}Lt.nextPersistentConnectionId_=0;Lt.nextConnectionId_=0;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ee{constructor(e,r){this.name=e,this.node=r}static Wrap(e,r){return new ee(e,r)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tl{getCompare(){return this.compare.bind(this)}indexedValueChanged(e,r){const s=new ee(Yn,e),l=new ee(Yn,r);return this.compare(s,l)!==0}minPost(){return ee.MIN}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Jo;class Yg extends Tl{static get __EMPTY_NODE(){return Jo}static set __EMPTY_NODE(e){Jo=e}compare(e,r){return Dr(e.name,r.name)}isDefinedOn(e){throw gi("KeyIndex.isDefinedOn not expected to be called.")}indexedValueChanged(e,r){return!1}minPost(){return ee.MIN}maxPost(){return new ee(En,Jo)}makePost(e,r){return D(typeof e=="string","KeyIndex indexValue must always be a string."),new ee(e,Jo)}toString(){return".key"}}const on=new Yg;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class el{constructor(e,r,s,l,u=null){this.isReverse_=l,this.resultGenerator_=u,this.nodeStack_=[];let d=1;for(;!e.isEmpty();)if(e=e,d=r?s(e.key,r):1,l&&(d*=-1),d<0)this.isReverse_?e=e.left:e=e.right;else if(d===0){this.nodeStack_.push(e);break}else this.nodeStack_.push(e),this.isReverse_?e=e.right:e=e.left}getNext(){if(this.nodeStack_.length===0)return null;let e=this.nodeStack_.pop(),r;if(this.resultGenerator_?r=this.resultGenerator_(e.key,e.value):r={key:e.key,value:e.value},this.isReverse_)for(e=e.left;!e.isEmpty();)this.nodeStack_.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack_.push(e),e=e.left;return r}hasNext(){return this.nodeStack_.length>0}peek(){if(this.nodeStack_.length===0)return null;const e=this.nodeStack_[this.nodeStack_.length-1];return this.resultGenerator_?this.resultGenerator_(e.key,e.value):{key:e.key,value:e.value}}}class We{constructor(e,r,s,l,u){this.key=e,this.value=r,this.color=s??We.RED,this.left=l??gt.EMPTY_NODE,this.right=u??gt.EMPTY_NODE}copy(e,r,s,l,u){return new We(e??this.key,r??this.value,s??this.color,l??this.left,u??this.right)}count(){return this.left.count()+1+this.right.count()}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||!!e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min_(){return this.left.isEmpty()?this:this.left.min_()}minKey(){return this.min_().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,r,s){let l=this;const u=s(e,l.key);return u<0?l=l.copy(null,null,null,l.left.insert(e,r,s),null):u===0?l=l.copy(null,r,null,null,null):l=l.copy(null,null,null,null,l.right.insert(e,r,s)),l.fixUp_()}removeMin_(){if(this.left.isEmpty())return gt.EMPTY_NODE;let e=this;return!e.left.isRed_()&&!e.left.left.isRed_()&&(e=e.moveRedLeft_()),e=e.copy(null,null,null,e.left.removeMin_(),null),e.fixUp_()}remove(e,r){let s,l;if(s=this,r(e,s.key)<0)!s.left.isEmpty()&&!s.left.isRed_()&&!s.left.left.isRed_()&&(s=s.moveRedLeft_()),s=s.copy(null,null,null,s.left.remove(e,r),null);else{if(s.left.isRed_()&&(s=s.rotateRight_()),!s.right.isEmpty()&&!s.right.isRed_()&&!s.right.left.isRed_()&&(s=s.moveRedRight_()),r(e,s.key)===0){if(s.right.isEmpty())return gt.EMPTY_NODE;l=s.right.min_(),s=s.copy(l.key,l.value,null,null,s.right.removeMin_())}s=s.copy(null,null,null,null,s.right.remove(e,r))}return s.fixUp_()}isRed_(){return this.color}fixUp_(){let e=this;return e.right.isRed_()&&!e.left.isRed_()&&(e=e.rotateLeft_()),e.left.isRed_()&&e.left.left.isRed_()&&(e=e.rotateRight_()),e.left.isRed_()&&e.right.isRed_()&&(e=e.colorFlip_()),e}moveRedLeft_(){let e=this.colorFlip_();return e.right.left.isRed_()&&(e=e.copy(null,null,null,null,e.right.rotateRight_()),e=e.rotateLeft_(),e=e.colorFlip_()),e}moveRedRight_(){let e=this.colorFlip_();return e.left.left.isRed_()&&(e=e.rotateRight_(),e=e.colorFlip_()),e}rotateLeft_(){const e=this.copy(null,null,We.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight_(){const e=this.copy(null,null,We.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip_(){const e=this.left.copy(null,null,!this.left.color,null,null),r=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,r)}checkMaxDepth_(){const e=this.check_();return Math.pow(2,e)<=this.count()+1}check_(){if(this.isRed_()&&this.left.isRed_())throw new Error("Red node has red child("+this.key+","+this.value+")");if(this.right.isRed_())throw new Error("Right child of ("+this.key+","+this.value+") is red");const e=this.left.check_();if(e!==this.right.check_())throw new Error("Black depths differ");return e+(this.isRed_()?0:1)}}We.RED=!0;We.BLACK=!1;class a2{copy(e,r,s,l,u){return this}insert(e,r,s){return new We(e,r,null)}remove(e,r){return this}count(){return 0}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}check_(){return 0}isRed_(){return!1}}class gt{constructor(e,r=gt.EMPTY_NODE){this.comparator_=e,this.root_=r}insert(e,r){return new gt(this.comparator_,this.root_.insert(e,r,this.comparator_).copy(null,null,We.BLACK,null,null))}remove(e){return new gt(this.comparator_,this.root_.remove(e,this.comparator_).copy(null,null,We.BLACK,null,null))}get(e){let r,s=this.root_;for(;!s.isEmpty();){if(r=this.comparator_(e,s.key),r===0)return s.value;r<0?s=s.left:r>0&&(s=s.right)}return null}getPredecessorKey(e){let r,s=this.root_,l=null;for(;!s.isEmpty();)if(r=this.comparator_(e,s.key),r===0){if(s.left.isEmpty())return l?l.key:null;for(s=s.left;!s.right.isEmpty();)s=s.right;return s.key}else r<0?s=s.left:r>0&&(l=s,s=s.right);throw new Error("Attempted to find predecessor key for a nonexistent key.  What gives?")}isEmpty(){return this.root_.isEmpty()}count(){return this.root_.count()}minKey(){return this.root_.minKey()}maxKey(){return this.root_.maxKey()}inorderTraversal(e){return this.root_.inorderTraversal(e)}reverseTraversal(e){return this.root_.reverseTraversal(e)}getIterator(e){return new el(this.root_,null,this.comparator_,!1,e)}getIteratorFrom(e,r){return new el(this.root_,e,this.comparator_,!1,r)}getReverseIteratorFrom(e,r){return new el(this.root_,e,this.comparator_,!0,r)}getReverseIterator(e){return new el(this.root_,null,this.comparator_,!0,e)}}gt.EMPTY_NODE=new a2;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function u2(n,e){return Dr(n.name,e.name)}function Zc(n,e){return Dr(n,e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Cc;function c2(n){Cc=n}const Xg=function(n){return typeof n=="number"?"number:"+Rg(n):"string:"+n},Zg=function(n){if(n.isLeafNode()){const e=n.val();D(typeof e=="string"||typeof e=="number"||typeof e=="object"&&Yt(e,".sv"),"Priority must be a string or number.")}else D(n===Cc||n.isEmpty(),"priority of unexpected type.");D(n===Cc||n.getPriority().isEmpty(),"Priority nodes can't have a priority of their own.")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let wm;class Ve{static set __childrenNodeConstructor(e){wm=e}static get __childrenNodeConstructor(){return wm}constructor(e,r=Ve.__childrenNodeConstructor.EMPTY_NODE){this.value_=e,this.priorityNode_=r,this.lazyHash_=null,D(this.value_!==void 0&&this.value_!==null,"LeafNode shouldn't be created with null/undefined value."),Zg(this.priorityNode_)}isLeafNode(){return!0}getPriority(){return this.priorityNode_}updatePriority(e){return new Ve(this.value_,e)}getImmediateChild(e){return e===".priority"?this.priorityNode_:Ve.__childrenNodeConstructor.EMPTY_NODE}getChild(e){return Z(e)?this:X(e)===".priority"?this.priorityNode_:Ve.__childrenNodeConstructor.EMPTY_NODE}hasChild(){return!1}getPredecessorChildName(e,r){return null}updateImmediateChild(e,r){return e===".priority"?this.updatePriority(r):r.isEmpty()&&e!==".priority"?this:Ve.__childrenNodeConstructor.EMPTY_NODE.updateImmediateChild(e,r).updatePriority(this.priorityNode_)}updateChild(e,r){const s=X(e);return s===null?r:r.isEmpty()&&s!==".priority"?this:(D(s!==".priority"||Xn(e)===1,".priority must be the last token in a path"),this.updateImmediateChild(s,Ve.__childrenNodeConstructor.EMPTY_NODE.updateChild(fe(e),r)))}isEmpty(){return!1}numChildren(){return 0}forEachChild(e,r){return!1}val(e){return e&&!this.getPriority().isEmpty()?{".value":this.getValue(),".priority":this.getPriority().val()}:this.getValue()}hash(){if(this.lazyHash_===null){let e="";this.priorityNode_.isEmpty()||(e+="priority:"+Xg(this.priorityNode_.val())+":");const r=typeof this.value_;e+=r+":",r==="number"?e+=Rg(this.value_):e+=this.value_,this.lazyHash_=Ig(e)}return this.lazyHash_}getValue(){return this.value_}compareTo(e){return e===Ve.__childrenNodeConstructor.EMPTY_NODE?1:e instanceof Ve.__childrenNodeConstructor?-1:(D(e.isLeafNode(),"Unknown node type"),this.compareToLeafNode_(e))}compareToLeafNode_(e){const r=typeof e.value_,s=typeof this.value_,l=Ve.VALUE_TYPE_ORDER.indexOf(r),u=Ve.VALUE_TYPE_ORDER.indexOf(s);return D(l>=0,"Unknown leaf type: "+r),D(u>=0,"Unknown leaf type: "+s),l===u?s==="object"?0:this.value_<e.value_?-1:this.value_===e.value_?0:1:u-l}withIndex(){return this}isIndexed(){return!0}equals(e){if(e===this)return!0;if(e.isLeafNode()){const r=e;return this.value_===r.value_&&this.priorityNode_.equals(r.priorityNode_)}else return!1}}Ve.VALUE_TYPE_ORDER=["object","boolean","number","string"];/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Jg,e_;function d2(n){Jg=n}function h2(n){e_=n}class f2 extends Tl{compare(e,r){const s=e.node.getPriority(),l=r.node.getPriority(),u=s.compareTo(l);return u===0?Dr(e.name,r.name):u}isDefinedOn(e){return!e.getPriority().isEmpty()}indexedValueChanged(e,r){return!e.getPriority().equals(r.getPriority())}minPost(){return ee.MIN}maxPost(){return new ee(En,new Ve("[PRIORITY-POST]",e_))}makePost(e,r){const s=Jg(e);return new ee(r,new Ve("[PRIORITY-POST]",s))}toString(){return".priority"}}const ve=new f2;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const p2=Math.log(2);class m2{constructor(e){const r=u=>parseInt(Math.log(u)/p2,10),s=u=>parseInt(Array(u+1).join("1"),2);this.count=r(e+1),this.current_=this.count-1;const l=s(this.count);this.bits_=e+1&l}nextBitIsOne(){const e=!(this.bits_&1<<this.current_);return this.current_--,e}}const ul=function(n,e,r,s){n.sort(e);const l=function(m,g){const y=g-m;let w,k;if(y===0)return null;if(y===1)return w=n[m],k=r?r(w):w,new We(k,w.node,We.BLACK,null,null);{const P=parseInt(y/2,10)+m,L=l(m,P),U=l(P+1,g);return w=n[P],k=r?r(w):w,new We(k,w.node,We.BLACK,L,U)}},u=function(m){let g=null,y=null,w=n.length;const k=function(L,U){const H=w-L,pe=w;w-=L;const he=l(H+1,pe),ae=n[H],ne=r?r(ae):ae;P(new We(ne,ae.node,U,null,he))},P=function(L){g?(g.left=L,g=L):(y=L,g=L)};for(let L=0;L<m.count;++L){const U=m.nextBitIsOne(),H=Math.pow(2,m.count-(L+1));U?k(H,We.BLACK):(k(H,We.BLACK),k(H,We.RED))}return y},d=new m2(n.length),f=u(d);return new gt(s||e,f)};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let ec;const li={};class vn{static get Default(){return D(li&&ve,"ChildrenNode.ts has not been loaded"),ec=ec||new vn({".priority":li},{".priority":ve}),ec}constructor(e,r){this.indexes_=e,this.indexSet_=r}get(e){const r=Er(this.indexes_,e);if(!r)throw new Error("No index defined for "+e);return r instanceof gt?r:null}hasIndex(e){return Yt(this.indexSet_,e.toString())}addIndex(e,r){D(e!==on,"KeyIndex always exists and isn't meant to be added to the IndexMap.");const s=[];let l=!1;const u=r.getIterator(ee.Wrap);let d=u.getNext();for(;d;)l=l||e.isDefinedOn(d.node),s.push(d),d=u.getNext();let f;l?f=ul(s,e.getCompare()):f=li;const m=e.toString(),g=Object.assign({},this.indexSet_);g[m]=e;const y=Object.assign({},this.indexes_);return y[m]=f,new vn(y,g)}addToIndexes(e,r){const s=il(this.indexes_,(l,u)=>{const d=Er(this.indexSet_,u);if(D(d,"Missing index implementation for "+u),l===li)if(d.isDefinedOn(e.node)){const f=[],m=r.getIterator(ee.Wrap);let g=m.getNext();for(;g;)g.name!==e.name&&f.push(g),g=m.getNext();return f.push(e),ul(f,d.getCompare())}else return li;else{const f=r.get(e.name);let m=l;return f&&(m=m.remove(new ee(e.name,f))),m.insert(e,e.node)}});return new vn(s,this.indexSet_)}removeFromIndexes(e,r){const s=il(this.indexes_,l=>{if(l===li)return l;{const u=r.get(e.name);return u?l.remove(new ee(e.name,u)):l}});return new vn(s,this.indexSet_)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let us;class K{static get EMPTY_NODE(){return us||(us=new K(new gt(Zc),null,vn.Default))}constructor(e,r,s){this.children_=e,this.priorityNode_=r,this.indexMap_=s,this.lazyHash_=null,this.priorityNode_&&Zg(this.priorityNode_),this.children_.isEmpty()&&D(!this.priorityNode_||this.priorityNode_.isEmpty(),"An empty node cannot have a priority")}isLeafNode(){return!1}getPriority(){return this.priorityNode_||us}updatePriority(e){return this.children_.isEmpty()?this:new K(this.children_,e,this.indexMap_)}getImmediateChild(e){if(e===".priority")return this.getPriority();{const r=this.children_.get(e);return r===null?us:r}}getChild(e){const r=X(e);return r===null?this:this.getImmediateChild(r).getChild(fe(e))}hasChild(e){return this.children_.get(e)!==null}updateImmediateChild(e,r){if(D(r,"We should always be passing snapshot nodes"),e===".priority")return this.updatePriority(r);{const s=new ee(e,r);let l,u;r.isEmpty()?(l=this.children_.remove(e),u=this.indexMap_.removeFromIndexes(s,this.children_)):(l=this.children_.insert(e,r),u=this.indexMap_.addToIndexes(s,this.children_));const d=l.isEmpty()?us:this.priorityNode_;return new K(l,d,u)}}updateChild(e,r){const s=X(e);if(s===null)return r;{D(X(e)!==".priority"||Xn(e)===1,".priority must be the last token in a path");const l=this.getImmediateChild(s).updateChild(fe(e),r);return this.updateImmediateChild(s,l)}}isEmpty(){return this.children_.isEmpty()}numChildren(){return this.children_.count()}val(e){if(this.isEmpty())return null;const r={};let s=0,l=0,u=!0;if(this.forEachChild(ve,(d,f)=>{r[d]=f.val(e),s++,u&&K.INTEGER_REGEXP_.test(d)?l=Math.max(l,Number(d)):u=!1}),!e&&u&&l<2*s){const d=[];for(const f in r)d[f]=r[f];return d}else return e&&!this.getPriority().isEmpty()&&(r[".priority"]=this.getPriority().val()),r}hash(){if(this.lazyHash_===null){let e="";this.getPriority().isEmpty()||(e+="priority:"+Xg(this.getPriority().val())+":"),this.forEachChild(ve,(r,s)=>{const l=s.hash();l!==""&&(e+=":"+r+":"+l)}),this.lazyHash_=e===""?"":Ig(e)}return this.lazyHash_}getPredecessorChildName(e,r,s){const l=this.resolveIndex_(s);if(l){const u=l.getPredecessorKey(new ee(e,r));return u?u.name:null}else return this.children_.getPredecessorKey(e)}getFirstChildName(e){const r=this.resolveIndex_(e);if(r){const s=r.minKey();return s&&s.name}else return this.children_.minKey()}getFirstChild(e){const r=this.getFirstChildName(e);return r?new ee(r,this.children_.get(r)):null}getLastChildName(e){const r=this.resolveIndex_(e);if(r){const s=r.maxKey();return s&&s.name}else return this.children_.maxKey()}getLastChild(e){const r=this.getLastChildName(e);return r?new ee(r,this.children_.get(r)):null}forEachChild(e,r){const s=this.resolveIndex_(e);return s?s.inorderTraversal(l=>r(l.name,l.node)):this.children_.inorderTraversal(r)}getIterator(e){return this.getIteratorFrom(e.minPost(),e)}getIteratorFrom(e,r){const s=this.resolveIndex_(r);if(s)return s.getIteratorFrom(e,l=>l);{const l=this.children_.getIteratorFrom(e.name,ee.Wrap);let u=l.peek();for(;u!=null&&r.compare(u,e)<0;)l.getNext(),u=l.peek();return l}}getReverseIterator(e){return this.getReverseIteratorFrom(e.maxPost(),e)}getReverseIteratorFrom(e,r){const s=this.resolveIndex_(r);if(s)return s.getReverseIteratorFrom(e,l=>l);{const l=this.children_.getReverseIteratorFrom(e.name,ee.Wrap);let u=l.peek();for(;u!=null&&r.compare(u,e)>0;)l.getNext(),u=l.peek();return l}}compareTo(e){return this.isEmpty()?e.isEmpty()?0:-1:e.isLeafNode()||e.isEmpty()?1:e===Ms?-1:0}withIndex(e){if(e===on||this.indexMap_.hasIndex(e))return this;{const r=this.indexMap_.addIndex(e,this.children_);return new K(this.children_,this.priorityNode_,r)}}isIndexed(e){return e===on||this.indexMap_.hasIndex(e)}equals(e){if(e===this)return!0;if(e.isLeafNode())return!1;{const r=e;if(this.getPriority().equals(r.getPriority()))if(this.children_.count()===r.children_.count()){const s=this.getIterator(ve),l=r.getIterator(ve);let u=s.getNext(),d=l.getNext();for(;u&&d;){if(u.name!==d.name||!u.node.equals(d.node))return!1;u=s.getNext(),d=l.getNext()}return u===null&&d===null}else return!1;else return!1}}resolveIndex_(e){return e===on?null:this.indexMap_.get(e.toString())}}K.INTEGER_REGEXP_=/^(0|[1-9]\d*)$/;class g2 extends K{constructor(){super(new gt(Zc),K.EMPTY_NODE,vn.Default)}compareTo(e){return e===this?0:1}equals(e){return e===this}getPriority(){return this}getImmediateChild(e){return K.EMPTY_NODE}isEmpty(){return!1}}const Ms=new g2;Object.defineProperties(ee,{MIN:{value:new ee(Yn,K.EMPTY_NODE)},MAX:{value:new ee(En,Ms)}});Yg.__EMPTY_NODE=K.EMPTY_NODE;Ve.__childrenNodeConstructor=K;c2(Ms);h2(Ms);/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _2=!0;function xe(n,e=null){if(n===null)return K.EMPTY_NODE;if(typeof n=="object"&&".priority"in n&&(e=n[".priority"]),D(e===null||typeof e=="string"||typeof e=="number"||typeof e=="object"&&".sv"in e,"Invalid priority type found: "+typeof e),typeof n=="object"&&".value"in n&&n[".value"]!==null&&(n=n[".value"]),typeof n!="object"||".sv"in n){const r=n;return new Ve(r,xe(e))}if(!(n instanceof Array)&&_2){const r=[];let s=!1;if(qe(n,(d,f)=>{if(d.substring(0,1)!=="."){const m=xe(f);m.isEmpty()||(s=s||!m.getPriority().isEmpty(),r.push(new ee(d,m)))}}),r.length===0)return K.EMPTY_NODE;const u=ul(r,u2,d=>d.name,Zc);if(s){const d=ul(r,ve.getCompare());return new K(u,xe(e),new vn({".priority":d},{".priority":ve}))}else return new K(u,xe(e),vn.Default)}else{let r=K.EMPTY_NODE;return qe(n,(s,l)=>{if(Yt(n,s)&&s.substring(0,1)!=="."){const u=xe(l);(u.isLeafNode()||!u.isEmpty())&&(r=r.updateImmediateChild(s,u))}}),r.updatePriority(xe(e))}}d2(xe);/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jc extends Tl{constructor(e){super(),this.indexPath_=e,D(!Z(e)&&X(e)!==".priority","Can't create PathIndex with empty path or .priority key")}extractChild(e){return e.getChild(this.indexPath_)}isDefinedOn(e){return!e.getChild(this.indexPath_).isEmpty()}compare(e,r){const s=this.extractChild(e.node),l=this.extractChild(r.node),u=s.compareTo(l);return u===0?Dr(e.name,r.name):u}makePost(e,r){const s=xe(e),l=K.EMPTY_NODE.updateChild(this.indexPath_,s);return new ee(r,l)}maxPost(){const e=K.EMPTY_NODE.updateChild(this.indexPath_,Ms);return new ee(En,e)}toString(){return ws(this.indexPath_,0).join("/")}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class y2 extends Tl{compare(e,r){const s=e.node.compareTo(r.node);return s===0?Dr(e.name,r.name):s}isDefinedOn(e){return!0}indexedValueChanged(e,r){return!e.equals(r)}minPost(){return ee.MIN}maxPost(){return ee.MAX}makePost(e,r){const s=xe(e);return new ee(r,s)}toString(){return".value"}}const ed=new y2;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function t_(n){return{type:"value",snapshotNode:n}}function hi(n,e){return{type:"child_added",snapshotNode:e,childName:n}}function ks(n,e){return{type:"child_removed",snapshotNode:e,childName:n}}function Cs(n,e,r){return{type:"child_changed",snapshotNode:e,childName:n,oldSnap:r}}function v2(n,e){return{type:"child_moved",snapshotNode:e,childName:n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class td{constructor(e){this.index_=e}updateChild(e,r,s,l,u,d){D(e.isIndexed(this.index_),"A node must be indexed if only a child is updated");const f=e.getImmediateChild(r);return f.getChild(l).equals(s.getChild(l))&&f.isEmpty()===s.isEmpty()||(d!=null&&(s.isEmpty()?e.hasChild(r)?d.trackChildChange(ks(r,f)):D(e.isLeafNode(),"A child remove without an old child only makes sense on a leaf node"):f.isEmpty()?d.trackChildChange(hi(r,s)):d.trackChildChange(Cs(r,s,f))),e.isLeafNode()&&s.isEmpty())?e:e.updateImmediateChild(r,s).withIndex(this.index_)}updateFullNode(e,r,s){return s!=null&&(e.isLeafNode()||e.forEachChild(ve,(l,u)=>{r.hasChild(l)||s.trackChildChange(ks(l,u))}),r.isLeafNode()||r.forEachChild(ve,(l,u)=>{if(e.hasChild(l)){const d=e.getImmediateChild(l);d.equals(u)||s.trackChildChange(Cs(l,u,d))}else s.trackChildChange(hi(l,u))})),r.withIndex(this.index_)}updatePriority(e,r){return e.isEmpty()?K.EMPTY_NODE:e.updatePriority(r)}filtersNodes(){return!1}getIndexedFilter(){return this}getIndex(){return this.index_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Es{constructor(e){this.indexedFilter_=new td(e.getIndex()),this.index_=e.getIndex(),this.startPost_=Es.getStartPost_(e),this.endPost_=Es.getEndPost_(e),this.startIsInclusive_=!e.startAfterSet_,this.endIsInclusive_=!e.endBeforeSet_}getStartPost(){return this.startPost_}getEndPost(){return this.endPost_}matches(e){const r=this.startIsInclusive_?this.index_.compare(this.getStartPost(),e)<=0:this.index_.compare(this.getStartPost(),e)<0,s=this.endIsInclusive_?this.index_.compare(e,this.getEndPost())<=0:this.index_.compare(e,this.getEndPost())<0;return r&&s}updateChild(e,r,s,l,u,d){return this.matches(new ee(r,s))||(s=K.EMPTY_NODE),this.indexedFilter_.updateChild(e,r,s,l,u,d)}updateFullNode(e,r,s){r.isLeafNode()&&(r=K.EMPTY_NODE);let l=r.withIndex(this.index_);l=l.updatePriority(K.EMPTY_NODE);const u=this;return r.forEachChild(ve,(d,f)=>{u.matches(new ee(d,f))||(l=l.updateImmediateChild(d,K.EMPTY_NODE))}),this.indexedFilter_.updateFullNode(e,l,s)}updatePriority(e,r){return e}filtersNodes(){return!0}getIndexedFilter(){return this.indexedFilter_}getIndex(){return this.index_}static getStartPost_(e){if(e.hasStart()){const r=e.getIndexStartName();return e.getIndex().makePost(e.getIndexStartValue(),r)}else return e.getIndex().minPost()}static getEndPost_(e){if(e.hasEnd()){const r=e.getIndexEndName();return e.getIndex().makePost(e.getIndexEndValue(),r)}else return e.getIndex().maxPost()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class w2{constructor(e){this.withinDirectionalStart=r=>this.reverse_?this.withinEndPost(r):this.withinStartPost(r),this.withinDirectionalEnd=r=>this.reverse_?this.withinStartPost(r):this.withinEndPost(r),this.withinStartPost=r=>{const s=this.index_.compare(this.rangedFilter_.getStartPost(),r);return this.startIsInclusive_?s<=0:s<0},this.withinEndPost=r=>{const s=this.index_.compare(r,this.rangedFilter_.getEndPost());return this.endIsInclusive_?s<=0:s<0},this.rangedFilter_=new Es(e),this.index_=e.getIndex(),this.limit_=e.getLimit(),this.reverse_=!e.isViewFromLeft(),this.startIsInclusive_=!e.startAfterSet_,this.endIsInclusive_=!e.endBeforeSet_}updateChild(e,r,s,l,u,d){return this.rangedFilter_.matches(new ee(r,s))||(s=K.EMPTY_NODE),e.getImmediateChild(r).equals(s)?e:e.numChildren()<this.limit_?this.rangedFilter_.getIndexedFilter().updateChild(e,r,s,l,u,d):this.fullLimitUpdateChild_(e,r,s,u,d)}updateFullNode(e,r,s){let l;if(r.isLeafNode()||r.isEmpty())l=K.EMPTY_NODE.withIndex(this.index_);else if(this.limit_*2<r.numChildren()&&r.isIndexed(this.index_)){l=K.EMPTY_NODE.withIndex(this.index_);let u;this.reverse_?u=r.getReverseIteratorFrom(this.rangedFilter_.getEndPost(),this.index_):u=r.getIteratorFrom(this.rangedFilter_.getStartPost(),this.index_);let d=0;for(;u.hasNext()&&d<this.limit_;){const f=u.getNext();if(this.withinDirectionalStart(f))if(this.withinDirectionalEnd(f))l=l.updateImmediateChild(f.name,f.node),d++;else break;else continue}}else{l=r.withIndex(this.index_),l=l.updatePriority(K.EMPTY_NODE);let u;this.reverse_?u=l.getReverseIterator(this.index_):u=l.getIterator(this.index_);let d=0;for(;u.hasNext();){const f=u.getNext();d<this.limit_&&this.withinDirectionalStart(f)&&this.withinDirectionalEnd(f)?d++:l=l.updateImmediateChild(f.name,K.EMPTY_NODE)}}return this.rangedFilter_.getIndexedFilter().updateFullNode(e,l,s)}updatePriority(e,r){return e}filtersNodes(){return!0}getIndexedFilter(){return this.rangedFilter_.getIndexedFilter()}getIndex(){return this.index_}fullLimitUpdateChild_(e,r,s,l,u){let d;if(this.reverse_){const w=this.index_.getCompare();d=(k,P)=>w(P,k)}else d=this.index_.getCompare();const f=e;D(f.numChildren()===this.limit_,"");const m=new ee(r,s),g=this.reverse_?f.getFirstChild(this.index_):f.getLastChild(this.index_),y=this.rangedFilter_.matches(m);if(f.hasChild(r)){const w=f.getImmediateChild(r);let k=l.getChildAfterChild(this.index_,g,this.reverse_);for(;k!=null&&(k.name===r||f.hasChild(k.name));)k=l.getChildAfterChild(this.index_,k,this.reverse_);const P=k==null?1:d(k,m);if(y&&!s.isEmpty()&&P>=0)return u!=null&&u.trackChildChange(Cs(r,s,w)),f.updateImmediateChild(r,s);{u!=null&&u.trackChildChange(ks(r,w));const U=f.updateImmediateChild(r,K.EMPTY_NODE);return k!=null&&this.rangedFilter_.matches(k)?(u!=null&&u.trackChildChange(hi(k.name,k.node)),U.updateImmediateChild(k.name,k.node)):U}}else return s.isEmpty()?e:y&&d(g,m)>=0?(u!=null&&(u.trackChildChange(ks(g.name,g.node)),u.trackChildChange(hi(r,s))),f.updateImmediateChild(r,s).updateImmediateChild(g.name,K.EMPTY_NODE)):e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Il{constructor(){this.limitSet_=!1,this.startSet_=!1,this.startNameSet_=!1,this.startAfterSet_=!1,this.endSet_=!1,this.endNameSet_=!1,this.endBeforeSet_=!1,this.limit_=0,this.viewFrom_="",this.indexStartValue_=null,this.indexStartName_="",this.indexEndValue_=null,this.indexEndName_="",this.index_=ve}hasStart(){return this.startSet_}isViewFromLeft(){return this.viewFrom_===""?this.startSet_:this.viewFrom_==="l"}getIndexStartValue(){return D(this.startSet_,"Only valid if start has been set"),this.indexStartValue_}getIndexStartName(){return D(this.startSet_,"Only valid if start has been set"),this.startNameSet_?this.indexStartName_:Yn}hasEnd(){return this.endSet_}getIndexEndValue(){return D(this.endSet_,"Only valid if end has been set"),this.indexEndValue_}getIndexEndName(){return D(this.endSet_,"Only valid if end has been set"),this.endNameSet_?this.indexEndName_:En}hasLimit(){return this.limitSet_}hasAnchoredLimit(){return this.limitSet_&&this.viewFrom_!==""}getLimit(){return D(this.limitSet_,"Only valid if limit has been set"),this.limit_}getIndex(){return this.index_}loadsAllData(){return!(this.startSet_||this.endSet_||this.limitSet_)}isDefault(){return this.loadsAllData()&&this.index_===ve}copy(){const e=new Il;return e.limitSet_=this.limitSet_,e.limit_=this.limit_,e.startSet_=this.startSet_,e.startAfterSet_=this.startAfterSet_,e.indexStartValue_=this.indexStartValue_,e.startNameSet_=this.startNameSet_,e.indexStartName_=this.indexStartName_,e.endSet_=this.endSet_,e.endBeforeSet_=this.endBeforeSet_,e.indexEndValue_=this.indexEndValue_,e.endNameSet_=this.endNameSet_,e.indexEndName_=this.indexEndName_,e.index_=this.index_,e.viewFrom_=this.viewFrom_,e}}function k2(n){return n.loadsAllData()?new td(n.getIndex()):n.hasLimit()?new w2(n):new Es(n)}function C2(n,e){const r=n.copy();return r.limitSet_=!0,r.limit_=e,r.viewFrom_="l",r}function E2(n,e){const r=n.copy();return r.limitSet_=!0,r.limit_=e,r.viewFrom_="r",r}function Ec(n,e,r){const s=n.copy();return s.startSet_=!0,e===void 0&&(e=null),s.indexStartValue_=e,r!=null?(s.startNameSet_=!0,s.indexStartName_=r):(s.startNameSet_=!1,s.indexStartName_=""),s}function S2(n,e,r){let s;return n.index_===on||r?s=Ec(n,e,r):s=Ec(n,e,En),s.startAfterSet_=!0,s}function Sc(n,e,r){const s=n.copy();return s.endSet_=!0,e===void 0&&(e=null),s.indexEndValue_=e,r!==void 0?(s.endNameSet_=!0,s.indexEndName_=r):(s.endNameSet_=!1,s.indexEndName_=""),s}function T2(n,e,r){let s;return n.index_===on||r?s=Sc(n,e,r):s=Sc(n,e,Yn),s.endBeforeSet_=!0,s}function xl(n,e){const r=n.copy();return r.index_=e,r}function km(n){const e={};if(n.isDefault())return e;let r;if(n.index_===ve?r="$priority":n.index_===ed?r="$value":n.index_===on?r="$key":(D(n.index_ instanceof Jc,"Unrecognized index type!"),r=n.index_.toString()),e.orderBy=Be(r),n.startSet_){const s=n.startAfterSet_?"startAfter":"startAt";e[s]=Be(n.indexStartValue_),n.startNameSet_&&(e[s]+=","+Be(n.indexStartName_))}if(n.endSet_){const s=n.endBeforeSet_?"endBefore":"endAt";e[s]=Be(n.indexEndValue_),n.endNameSet_&&(e[s]+=","+Be(n.indexEndName_))}return n.limitSet_&&(n.isViewFromLeft()?e.limitToFirst=n.limit_:e.limitToLast=n.limit_),e}function Cm(n){const e={};if(n.startSet_&&(e.sp=n.indexStartValue_,n.startNameSet_&&(e.sn=n.indexStartName_),e.sin=!n.startAfterSet_),n.endSet_&&(e.ep=n.indexEndValue_,n.endNameSet_&&(e.en=n.indexEndName_),e.ein=!n.endBeforeSet_),n.limitSet_){e.l=n.limit_;let r=n.viewFrom_;r===""&&(n.isViewFromLeft()?r="l":r="r"),e.vf=r}return n.index_!==ve&&(e.i=n.index_.toString()),e}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cl extends qg{reportStats(e){throw new Error("Method not implemented.")}static getListenId_(e,r){return r!==void 0?"tag$"+r:(D(e._queryParams.isDefault(),"should have a tag if it's not a default query."),e._path.toString())}constructor(e,r,s,l){super(),this.repoInfo_=e,this.onDataUpdate_=r,this.authTokenProvider_=s,this.appCheckTokenProvider_=l,this.log_=As("p:rest:"),this.listens_={}}listen(e,r,s,l){const u=e._path.toString();this.log_("Listen called for "+u+" "+e._queryIdentifier);const d=cl.getListenId_(e,s),f={};this.listens_[d]=f;const m=km(e._queryParams);this.restRequest_(u+".json",m,(g,y)=>{let w=y;if(g===404&&(w=null,g=null),g===null&&this.onDataUpdate_(u,w,!1,s),Er(this.listens_,d)===f){let k;g?g===401?k="permission_denied":k="rest_error:"+g:k="ok",l(k,null)}})}unlisten(e,r){const s=cl.getListenId_(e,r);delete this.listens_[s]}get(e){const r=km(e._queryParams),s=e._path.toString(),l=new St;return this.restRequest_(s+".json",r,(u,d)=>{let f=d;u===404&&(f=null,u=null),u===null?(this.onDataUpdate_(s,f,!1,null),l.resolve(f)):l.reject(new Error(f))}),l.promise}refreshAuthToken(e){}restRequest_(e,r={},s){return r.format="export",Promise.all([this.authTokenProvider_.getToken(!1),this.appCheckTokenProvider_.getToken(!1)]).then(([l,u])=>{l&&l.accessToken&&(r.auth=l.accessToken),u&&u.token&&(r.ac=u.token);const d=(this.repoInfo_.secure?"https://":"http://")+this.repoInfo_.host+e+"?ns="+this.repoInfo_.namespace+rv(r);this.log_("Sending REST request for "+d);const f=new XMLHttpRequest;f.onreadystatechange=()=>{if(s&&f.readyState===4){this.log_("REST Response for "+d+" received. status:",f.status,"response:",f.responseText);let m=null;if(f.status>=200&&f.status<300){try{m=ys(f.responseText)}catch{nt("Failed to parse JSON response for "+d+": "+f.responseText)}s(null,m)}else f.status!==401&&f.status!==404&&nt("Got unsuccessful REST response for "+d+" Status: "+f.status),s(f.status);s=null}},f.open("GET",d,!0),f.send()})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class I2{constructor(){this.rootNode_=K.EMPTY_NODE}getNode(e){return this.rootNode_.getChild(e)}updateSnapshot(e,r){this.rootNode_=this.rootNode_.updateChild(e,r)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function dl(){return{value:null,children:new Map}}function yi(n,e,r){if(Z(e))n.value=r,n.children.clear();else if(n.value!==null)n.value=n.value.updateChild(e,r);else{const s=X(e);n.children.has(s)||n.children.set(s,dl());const l=n.children.get(s);e=fe(e),yi(l,e,r)}}function Tc(n,e){if(Z(e))return n.value=null,n.children.clear(),!0;if(n.value!==null){if(n.value.isLeafNode())return!1;{const r=n.value;return n.value=null,r.forEachChild(ve,(s,l)=>{yi(n,new ue(s),l)}),Tc(n,e)}}else if(n.children.size>0){const r=X(e);return e=fe(e),n.children.has(r)&&Tc(n.children.get(r),e)&&n.children.delete(r),n.children.size===0}else return!0}function Ic(n,e,r){n.value!==null?r(e,n.value):x2(n,(s,l)=>{const u=new ue(e.toString()+"/"+s);Ic(l,u,r)})}function x2(n,e){n.children.forEach((r,s)=>{e(s,r)})}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class N2{constructor(e){this.collection_=e,this.last_=null}get(){const e=this.collection_.get(),r=Object.assign({},e);return this.last_&&qe(this.last_,(s,l)=>{r[s]=r[s]-l}),this.last_=e,r}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Em=10*1e3,R2=30*1e3,P2=300*1e3;class A2{constructor(e,r){this.server_=r,this.statsToReport_={},this.statsListener_=new N2(e);const s=Em+(R2-Em)*Math.random();fs(this.reportStats_.bind(this),Math.floor(s))}reportStats_(){const e=this.statsListener_.get(),r={};let s=!1;qe(e,(l,u)=>{u>0&&Yt(this.statsToReport_,l)&&(r[l]=u,s=!0)}),s&&this.server_.reportStats(r),fs(this.reportStats_.bind(this),Math.floor(Math.random()*2*P2))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Kt;(function(n){n[n.OVERWRITE=0]="OVERWRITE",n[n.MERGE=1]="MERGE",n[n.ACK_USER_WRITE=2]="ACK_USER_WRITE",n[n.LISTEN_COMPLETE=3]="LISTEN_COMPLETE"})(Kt||(Kt={}));function nd(){return{fromUser:!0,fromServer:!1,queryId:null,tagged:!1}}function rd(){return{fromUser:!1,fromServer:!0,queryId:null,tagged:!1}}function id(n){return{fromUser:!1,fromServer:!0,queryId:n,tagged:!0}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hl{constructor(e,r,s){this.path=e,this.affectedTree=r,this.revert=s,this.type=Kt.ACK_USER_WRITE,this.source=nd()}operationForChild(e){if(Z(this.path)){if(this.affectedTree.value!=null)return D(this.affectedTree.children.isEmpty(),"affectedTree should not have overlapping affected paths."),this;{const r=this.affectedTree.subtree(new ue(e));return new hl(le(),r,this.revert)}}else return D(X(this.path)===e,"operationForChild called for unrelated child."),new hl(fe(this.path),this.affectedTree,this.revert)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ss{constructor(e,r){this.source=e,this.path=r,this.type=Kt.LISTEN_COMPLETE}operationForChild(e){return Z(this.path)?new Ss(this.source,le()):new Ss(this.source,fe(this.path))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tr{constructor(e,r,s){this.source=e,this.path=r,this.snap=s,this.type=Kt.OVERWRITE}operationForChild(e){return Z(this.path)?new Tr(this.source,le(),this.snap.getImmediateChild(e)):new Tr(this.source,fe(this.path),this.snap)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fi{constructor(e,r,s){this.source=e,this.path=r,this.children=s,this.type=Kt.MERGE}operationForChild(e){if(Z(this.path)){const r=this.children.subtree(new ue(e));return r.isEmpty()?null:r.value?new Tr(this.source,le(),r.value):new fi(this.source,le(),r)}else return D(X(this.path)===e,"Can't get a merge for a child not on the path of the operation"),new fi(this.source,fe(this.path),this.children)}toString(){return"Operation("+this.path+": "+this.source.toString()+" merge: "+this.children.toString()+")"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zn{constructor(e,r,s){this.node_=e,this.fullyInitialized_=r,this.filtered_=s}isFullyInitialized(){return this.fullyInitialized_}isFiltered(){return this.filtered_}isCompleteForPath(e){if(Z(e))return this.isFullyInitialized()&&!this.filtered_;const r=X(e);return this.isCompleteForChild(r)}isCompleteForChild(e){return this.isFullyInitialized()&&!this.filtered_||this.node_.hasChild(e)}getNode(){return this.node_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class M2{constructor(e){this.query_=e,this.index_=this.query_._queryParams.getIndex()}}function D2(n,e,r,s){const l=[],u=[];return e.forEach(d=>{d.type==="child_changed"&&n.index_.indexedValueChanged(d.oldSnap,d.snapshotNode)&&u.push(v2(d.childName,d.snapshotNode))}),cs(n,l,"child_removed",e,s,r),cs(n,l,"child_added",e,s,r),cs(n,l,"child_moved",u,s,r),cs(n,l,"child_changed",e,s,r),cs(n,l,"value",e,s,r),l}function cs(n,e,r,s,l,u){const d=s.filter(f=>f.type===r);d.sort((f,m)=>L2(n,f,m)),d.forEach(f=>{const m=O2(n,f,u);l.forEach(g=>{g.respondsTo(f.type)&&e.push(g.createEvent(m,n.query_))})})}function O2(n,e,r){return e.type==="value"||e.type==="child_removed"||(e.prevName=r.getPredecessorChildName(e.childName,e.snapshotNode,n.index_)),e}function L2(n,e,r){if(e.childName==null||r.childName==null)throw gi("Should only compare child_ events.");const s=new ee(e.childName,e.snapshotNode),l=new ee(r.childName,r.snapshotNode);return n.index_.compare(s,l)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Nl(n,e){return{eventCache:n,serverCache:e}}function ps(n,e,r,s){return Nl(new Zn(e,r,s),n.serverCache)}function n_(n,e,r,s){return Nl(n.eventCache,new Zn(e,r,s))}function fl(n){return n.eventCache.isFullyInitialized()?n.eventCache.getNode():null}function Ir(n){return n.serverCache.isFullyInitialized()?n.serverCache.getNode():null}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let tc;const b2=()=>(tc||(tc=new gt(yw)),tc);class _e{static fromObject(e){let r=new _e(null);return qe(e,(s,l)=>{r=r.set(new ue(s),l)}),r}constructor(e,r=b2()){this.value=e,this.children=r}isEmpty(){return this.value===null&&this.children.isEmpty()}findRootMostMatchingPathAndValue(e,r){if(this.value!=null&&r(this.value))return{path:le(),value:this.value};if(Z(e))return null;{const s=X(e),l=this.children.get(s);if(l!==null){const u=l.findRootMostMatchingPathAndValue(fe(e),r);return u!=null?{path:Se(new ue(s),u.path),value:u.value}:null}else return null}}findRootMostValueAndPath(e){return this.findRootMostMatchingPathAndValue(e,()=>!0)}subtree(e){if(Z(e))return this;{const r=X(e),s=this.children.get(r);return s!==null?s.subtree(fe(e)):new _e(null)}}set(e,r){if(Z(e))return new _e(r,this.children);{const s=X(e),u=(this.children.get(s)||new _e(null)).set(fe(e),r),d=this.children.insert(s,u);return new _e(this.value,d)}}remove(e){if(Z(e))return this.children.isEmpty()?new _e(null):new _e(null,this.children);{const r=X(e),s=this.children.get(r);if(s){const l=s.remove(fe(e));let u;return l.isEmpty()?u=this.children.remove(r):u=this.children.insert(r,l),this.value===null&&u.isEmpty()?new _e(null):new _e(this.value,u)}else return this}}get(e){if(Z(e))return this.value;{const r=X(e),s=this.children.get(r);return s?s.get(fe(e)):null}}setTree(e,r){if(Z(e))return r;{const s=X(e),u=(this.children.get(s)||new _e(null)).setTree(fe(e),r);let d;return u.isEmpty()?d=this.children.remove(s):d=this.children.insert(s,u),new _e(this.value,d)}}fold(e){return this.fold_(le(),e)}fold_(e,r){const s={};return this.children.inorderTraversal((l,u)=>{s[l]=u.fold_(Se(e,l),r)}),r(e,this.value,s)}findOnPath(e,r){return this.findOnPath_(e,le(),r)}findOnPath_(e,r,s){const l=this.value?s(r,this.value):!1;if(l)return l;if(Z(e))return null;{const u=X(e),d=this.children.get(u);return d?d.findOnPath_(fe(e),Se(r,u),s):null}}foreachOnPath(e,r){return this.foreachOnPath_(e,le(),r)}foreachOnPath_(e,r,s){if(Z(e))return this;{this.value&&s(r,this.value);const l=X(e),u=this.children.get(l);return u?u.foreachOnPath_(fe(e),Se(r,l),s):new _e(null)}}foreach(e){this.foreach_(le(),e)}foreach_(e,r){this.children.inorderTraversal((s,l)=>{l.foreach_(Se(e,s),r)}),this.value&&r(e,this.value)}foreachChild(e){this.children.inorderTraversal((r,s)=>{s.value&&e(r,s.value)})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gt{constructor(e){this.writeTree_=e}static empty(){return new Gt(new _e(null))}}function ms(n,e,r){if(Z(e))return new Gt(new _e(r));{const s=n.writeTree_.findRootMostValueAndPath(e);if(s!=null){const l=s.path;let u=s.value;const d=lt(l,e);return u=u.updateChild(d,r),new Gt(n.writeTree_.set(l,u))}else{const l=new _e(r),u=n.writeTree_.setTree(e,l);return new Gt(u)}}}function xc(n,e,r){let s=n;return qe(r,(l,u)=>{s=ms(s,Se(e,l),u)}),s}function Sm(n,e){if(Z(e))return Gt.empty();{const r=n.writeTree_.setTree(e,new _e(null));return new Gt(r)}}function Nc(n,e){return Or(n,e)!=null}function Or(n,e){const r=n.writeTree_.findRootMostValueAndPath(e);return r!=null?n.writeTree_.get(r.path).getChild(lt(r.path,e)):null}function Tm(n){const e=[],r=n.writeTree_.value;return r!=null?r.isLeafNode()||r.forEachChild(ve,(s,l)=>{e.push(new ee(s,l))}):n.writeTree_.children.inorderTraversal((s,l)=>{l.value!=null&&e.push(new ee(s,l.value))}),e}function Qn(n,e){if(Z(e))return n;{const r=Or(n,e);return r!=null?new Gt(new _e(r)):new Gt(n.writeTree_.subtree(e))}}function Rc(n){return n.writeTree_.isEmpty()}function pi(n,e){return r_(le(),n.writeTree_,e)}function r_(n,e,r){if(e.value!=null)return r.updateChild(n,e.value);{let s=null;return e.children.inorderTraversal((l,u)=>{l===".priority"?(D(u.value!==null,"Priority writes must always be leaf nodes"),s=u.value):r=r_(Se(n,l),u,r)}),!r.getChild(n).isEmpty()&&s!==null&&(r=r.updateChild(Se(n,".priority"),s)),r}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Rl(n,e){return l_(e,n)}function F2(n,e,r,s,l){D(s>n.lastWriteId,"Stacking an older write on top of newer ones"),l===void 0&&(l=!0),n.allWrites.push({path:e,snap:r,writeId:s,visible:l}),l&&(n.visibleWrites=ms(n.visibleWrites,e,r)),n.lastWriteId=s}function U2(n,e,r,s){D(s>n.lastWriteId,"Stacking an older merge on top of newer ones"),n.allWrites.push({path:e,children:r,writeId:s,visible:!0}),n.visibleWrites=xc(n.visibleWrites,e,r),n.lastWriteId=s}function B2(n,e){for(let r=0;r<n.allWrites.length;r++){const s=n.allWrites[r];if(s.writeId===e)return s}return null}function z2(n,e){const r=n.allWrites.findIndex(f=>f.writeId===e);D(r>=0,"removeWrite called with nonexistent writeId.");const s=n.allWrites[r];n.allWrites.splice(r,1);let l=s.visible,u=!1,d=n.allWrites.length-1;for(;l&&d>=0;){const f=n.allWrites[d];f.visible&&(d>=r&&j2(f,s.path)?l=!1:Dt(s.path,f.path)&&(u=!0)),d--}if(l){if(u)return H2(n),!0;if(s.snap)n.visibleWrites=Sm(n.visibleWrites,s.path);else{const f=s.children;qe(f,m=>{n.visibleWrites=Sm(n.visibleWrites,Se(s.path,m))})}return!0}else return!1}function j2(n,e){if(n.snap)return Dt(n.path,e);for(const r in n.children)if(n.children.hasOwnProperty(r)&&Dt(Se(n.path,r),e))return!0;return!1}function H2(n){n.visibleWrites=i_(n.allWrites,V2,le()),n.allWrites.length>0?n.lastWriteId=n.allWrites[n.allWrites.length-1].writeId:n.lastWriteId=-1}function V2(n){return n.visible}function i_(n,e,r){let s=Gt.empty();for(let l=0;l<n.length;++l){const u=n[l];if(e(u)){const d=u.path;let f;if(u.snap)Dt(r,d)?(f=lt(r,d),s=ms(s,f,u.snap)):Dt(d,r)&&(f=lt(d,r),s=ms(s,le(),u.snap.getChild(f)));else if(u.children){if(Dt(r,d))f=lt(r,d),s=xc(s,f,u.children);else if(Dt(d,r))if(f=lt(d,r),Z(f))s=xc(s,le(),u.children);else{const m=Er(u.children,X(f));if(m){const g=m.getChild(fe(f));s=ms(s,le(),g)}}}else throw gi("WriteRecord should have .snap or .children")}}return s}function s_(n,e,r,s,l){if(!s&&!l){const u=Or(n.visibleWrites,e);if(u!=null)return u;{const d=Qn(n.visibleWrites,e);if(Rc(d))return r;if(r==null&&!Nc(d,le()))return null;{const f=r||K.EMPTY_NODE;return pi(d,f)}}}else{const u=Qn(n.visibleWrites,e);if(!l&&Rc(u))return r;if(!l&&r==null&&!Nc(u,le()))return null;{const d=function(g){return(g.visible||l)&&(!s||!~s.indexOf(g.writeId))&&(Dt(g.path,e)||Dt(e,g.path))},f=i_(n.allWrites,d,e),m=r||K.EMPTY_NODE;return pi(f,m)}}}function W2(n,e,r){let s=K.EMPTY_NODE;const l=Or(n.visibleWrites,e);if(l)return l.isLeafNode()||l.forEachChild(ve,(u,d)=>{s=s.updateImmediateChild(u,d)}),s;if(r){const u=Qn(n.visibleWrites,e);return r.forEachChild(ve,(d,f)=>{const m=pi(Qn(u,new ue(d)),f);s=s.updateImmediateChild(d,m)}),Tm(u).forEach(d=>{s=s.updateImmediateChild(d.name,d.node)}),s}else{const u=Qn(n.visibleWrites,e);return Tm(u).forEach(d=>{s=s.updateImmediateChild(d.name,d.node)}),s}}function $2(n,e,r,s,l){D(s||l,"Either existingEventSnap or existingServerSnap must exist");const u=Se(e,r);if(Nc(n.visibleWrites,u))return null;{const d=Qn(n.visibleWrites,u);return Rc(d)?l.getChild(r):pi(d,l.getChild(r))}}function q2(n,e,r,s){const l=Se(e,r),u=Or(n.visibleWrites,l);if(u!=null)return u;if(s.isCompleteForChild(r)){const d=Qn(n.visibleWrites,l);return pi(d,s.getNode().getImmediateChild(r))}else return null}function K2(n,e){return Or(n.visibleWrites,e)}function Q2(n,e,r,s,l,u,d){let f;const m=Qn(n.visibleWrites,e),g=Or(m,le());if(g!=null)f=g;else if(r!=null)f=pi(m,r);else return[];if(f=f.withIndex(d),!f.isEmpty()&&!f.isLeafNode()){const y=[],w=d.getCompare(),k=u?f.getReverseIteratorFrom(s,d):f.getIteratorFrom(s,d);let P=k.getNext();for(;P&&y.length<l;)w(P,s)!==0&&y.push(P),P=k.getNext();return y}else return[]}function G2(){return{visibleWrites:Gt.empty(),allWrites:[],lastWriteId:-1}}function pl(n,e,r,s){return s_(n.writeTree,n.treePath,e,r,s)}function sd(n,e){return W2(n.writeTree,n.treePath,e)}function Im(n,e,r,s){return $2(n.writeTree,n.treePath,e,r,s)}function ml(n,e){return K2(n.writeTree,Se(n.treePath,e))}function Y2(n,e,r,s,l,u){return Q2(n.writeTree,n.treePath,e,r,s,l,u)}function od(n,e,r){return q2(n.writeTree,n.treePath,e,r)}function o_(n,e){return l_(Se(n.treePath,e),n.writeTree)}function l_(n,e){return{treePath:n,writeTree:e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class X2{constructor(){this.changeMap=new Map}trackChildChange(e){const r=e.type,s=e.childName;D(r==="child_added"||r==="child_changed"||r==="child_removed","Only child changes supported for tracking"),D(s!==".priority","Only non-priority child changes can be tracked.");const l=this.changeMap.get(s);if(l){const u=l.type;if(r==="child_added"&&u==="child_removed")this.changeMap.set(s,Cs(s,e.snapshotNode,l.snapshotNode));else if(r==="child_removed"&&u==="child_added")this.changeMap.delete(s);else if(r==="child_removed"&&u==="child_changed")this.changeMap.set(s,ks(s,l.oldSnap));else if(r==="child_changed"&&u==="child_added")this.changeMap.set(s,hi(s,e.snapshotNode));else if(r==="child_changed"&&u==="child_changed")this.changeMap.set(s,Cs(s,e.snapshotNode,l.oldSnap));else throw gi("Illegal combination of changes: "+e+" occurred after "+l)}else this.changeMap.set(s,e)}getChanges(){return Array.from(this.changeMap.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Z2{getCompleteChild(e){return null}getChildAfterChild(e,r,s){return null}}const a_=new Z2;class ld{constructor(e,r,s=null){this.writes_=e,this.viewCache_=r,this.optCompleteServerCache_=s}getCompleteChild(e){const r=this.viewCache_.eventCache;if(r.isCompleteForChild(e))return r.getNode().getImmediateChild(e);{const s=this.optCompleteServerCache_!=null?new Zn(this.optCompleteServerCache_,!0,!1):this.viewCache_.serverCache;return od(this.writes_,e,s)}}getChildAfterChild(e,r,s){const l=this.optCompleteServerCache_!=null?this.optCompleteServerCache_:Ir(this.viewCache_),u=Y2(this.writes_,l,r,1,s,e);return u.length===0?null:u[0]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function J2(n){return{filter:n}}function ek(n,e){D(e.eventCache.getNode().isIndexed(n.filter.getIndex()),"Event snap not indexed"),D(e.serverCache.getNode().isIndexed(n.filter.getIndex()),"Server snap not indexed")}function tk(n,e,r,s,l){const u=new X2;let d,f;if(r.type===Kt.OVERWRITE){const g=r;g.source.fromUser?d=Pc(n,e,g.path,g.snap,s,l,u):(D(g.source.fromServer,"Unknown source."),f=g.source.tagged||e.serverCache.isFiltered()&&!Z(g.path),d=gl(n,e,g.path,g.snap,s,l,f,u))}else if(r.type===Kt.MERGE){const g=r;g.source.fromUser?d=rk(n,e,g.path,g.children,s,l,u):(D(g.source.fromServer,"Unknown source."),f=g.source.tagged||e.serverCache.isFiltered(),d=Ac(n,e,g.path,g.children,s,l,f,u))}else if(r.type===Kt.ACK_USER_WRITE){const g=r;g.revert?d=ok(n,e,g.path,s,l,u):d=ik(n,e,g.path,g.affectedTree,s,l,u)}else if(r.type===Kt.LISTEN_COMPLETE)d=sk(n,e,r.path,s,u);else throw gi("Unknown operation type: "+r.type);const m=u.getChanges();return nk(e,d,m),{viewCache:d,changes:m}}function nk(n,e,r){const s=e.eventCache;if(s.isFullyInitialized()){const l=s.getNode().isLeafNode()||s.getNode().isEmpty(),u=fl(n);(r.length>0||!n.eventCache.isFullyInitialized()||l&&!s.getNode().equals(u)||!s.getNode().getPriority().equals(u.getPriority()))&&r.push(t_(fl(e)))}}function u_(n,e,r,s,l,u){const d=e.eventCache;if(ml(s,r)!=null)return e;{let f,m;if(Z(r))if(D(e.serverCache.isFullyInitialized(),"If change path is empty, we must have complete server data"),e.serverCache.isFiltered()){const g=Ir(e),y=g instanceof K?g:K.EMPTY_NODE,w=sd(s,y);f=n.filter.updateFullNode(e.eventCache.getNode(),w,u)}else{const g=pl(s,Ir(e));f=n.filter.updateFullNode(e.eventCache.getNode(),g,u)}else{const g=X(r);if(g===".priority"){D(Xn(r)===1,"Can't have a priority with additional path components");const y=d.getNode();m=e.serverCache.getNode();const w=Im(s,r,y,m);w!=null?f=n.filter.updatePriority(y,w):f=d.getNode()}else{const y=fe(r);let w;if(d.isCompleteForChild(g)){m=e.serverCache.getNode();const k=Im(s,r,d.getNode(),m);k!=null?w=d.getNode().getImmediateChild(g).updateChild(y,k):w=d.getNode().getImmediateChild(g)}else w=od(s,g,e.serverCache);w!=null?f=n.filter.updateChild(d.getNode(),g,w,y,l,u):f=d.getNode()}}return ps(e,f,d.isFullyInitialized()||Z(r),n.filter.filtersNodes())}}function gl(n,e,r,s,l,u,d,f){const m=e.serverCache;let g;const y=d?n.filter:n.filter.getIndexedFilter();if(Z(r))g=y.updateFullNode(m.getNode(),s,null);else if(y.filtersNodes()&&!m.isFiltered()){const P=m.getNode().updateChild(r,s);g=y.updateFullNode(m.getNode(),P,null)}else{const P=X(r);if(!m.isCompleteForPath(r)&&Xn(r)>1)return e;const L=fe(r),H=m.getNode().getImmediateChild(P).updateChild(L,s);P===".priority"?g=y.updatePriority(m.getNode(),H):g=y.updateChild(m.getNode(),P,H,L,a_,null)}const w=n_(e,g,m.isFullyInitialized()||Z(r),y.filtersNodes()),k=new ld(l,w,u);return u_(n,w,r,l,k,f)}function Pc(n,e,r,s,l,u,d){const f=e.eventCache;let m,g;const y=new ld(l,e,u);if(Z(r))g=n.filter.updateFullNode(e.eventCache.getNode(),s,d),m=ps(e,g,!0,n.filter.filtersNodes());else{const w=X(r);if(w===".priority")g=n.filter.updatePriority(e.eventCache.getNode(),s),m=ps(e,g,f.isFullyInitialized(),f.isFiltered());else{const k=fe(r),P=f.getNode().getImmediateChild(w);let L;if(Z(k))L=s;else{const U=y.getCompleteChild(w);U!=null?Gc(k)===".priority"&&U.getChild(Qg(k)).isEmpty()?L=U:L=U.updateChild(k,s):L=K.EMPTY_NODE}if(P.equals(L))m=e;else{const U=n.filter.updateChild(f.getNode(),w,L,k,y,d);m=ps(e,U,f.isFullyInitialized(),n.filter.filtersNodes())}}}return m}function xm(n,e){return n.eventCache.isCompleteForChild(e)}function rk(n,e,r,s,l,u,d){let f=e;return s.foreach((m,g)=>{const y=Se(r,m);xm(e,X(y))&&(f=Pc(n,f,y,g,l,u,d))}),s.foreach((m,g)=>{const y=Se(r,m);xm(e,X(y))||(f=Pc(n,f,y,g,l,u,d))}),f}function Nm(n,e,r){return r.foreach((s,l)=>{e=e.updateChild(s,l)}),e}function Ac(n,e,r,s,l,u,d,f){if(e.serverCache.getNode().isEmpty()&&!e.serverCache.isFullyInitialized())return e;let m=e,g;Z(r)?g=s:g=new _e(null).setTree(r,s);const y=e.serverCache.getNode();return g.children.inorderTraversal((w,k)=>{if(y.hasChild(w)){const P=e.serverCache.getNode().getImmediateChild(w),L=Nm(n,P,k);m=gl(n,m,new ue(w),L,l,u,d,f)}}),g.children.inorderTraversal((w,k)=>{const P=!e.serverCache.isCompleteForChild(w)&&k.value===null;if(!y.hasChild(w)&&!P){const L=e.serverCache.getNode().getImmediateChild(w),U=Nm(n,L,k);m=gl(n,m,new ue(w),U,l,u,d,f)}}),m}function ik(n,e,r,s,l,u,d){if(ml(l,r)!=null)return e;const f=e.serverCache.isFiltered(),m=e.serverCache;if(s.value!=null){if(Z(r)&&m.isFullyInitialized()||m.isCompleteForPath(r))return gl(n,e,r,m.getNode().getChild(r),l,u,f,d);if(Z(r)){let g=new _e(null);return m.getNode().forEachChild(on,(y,w)=>{g=g.set(new ue(y),w)}),Ac(n,e,r,g,l,u,f,d)}else return e}else{let g=new _e(null);return s.foreach((y,w)=>{const k=Se(r,y);m.isCompleteForPath(k)&&(g=g.set(y,m.getNode().getChild(k)))}),Ac(n,e,r,g,l,u,f,d)}}function sk(n,e,r,s,l){const u=e.serverCache,d=n_(e,u.getNode(),u.isFullyInitialized()||Z(r),u.isFiltered());return u_(n,d,r,s,a_,l)}function ok(n,e,r,s,l,u){let d;if(ml(s,r)!=null)return e;{const f=new ld(s,e,l),m=e.eventCache.getNode();let g;if(Z(r)||X(r)===".priority"){let y;if(e.serverCache.isFullyInitialized())y=pl(s,Ir(e));else{const w=e.serverCache.getNode();D(w instanceof K,"serverChildren would be complete if leaf node"),y=sd(s,w)}y=y,g=n.filter.updateFullNode(m,y,u)}else{const y=X(r);let w=od(s,y,e.serverCache);w==null&&e.serverCache.isCompleteForChild(y)&&(w=m.getImmediateChild(y)),w!=null?g=n.filter.updateChild(m,y,w,fe(r),f,u):e.eventCache.getNode().hasChild(y)?g=n.filter.updateChild(m,y,K.EMPTY_NODE,fe(r),f,u):g=m,g.isEmpty()&&e.serverCache.isFullyInitialized()&&(d=pl(s,Ir(e)),d.isLeafNode()&&(g=n.filter.updateFullNode(g,d,u)))}return d=e.serverCache.isFullyInitialized()||ml(s,le())!=null,ps(e,g,d,n.filter.filtersNodes())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lk{constructor(e,r){this.query_=e,this.eventRegistrations_=[];const s=this.query_._queryParams,l=new td(s.getIndex()),u=k2(s);this.processor_=J2(u);const d=r.serverCache,f=r.eventCache,m=l.updateFullNode(K.EMPTY_NODE,d.getNode(),null),g=u.updateFullNode(K.EMPTY_NODE,f.getNode(),null),y=new Zn(m,d.isFullyInitialized(),l.filtersNodes()),w=new Zn(g,f.isFullyInitialized(),u.filtersNodes());this.viewCache_=Nl(w,y),this.eventGenerator_=new M2(this.query_)}get query(){return this.query_}}function ak(n){return n.viewCache_.serverCache.getNode()}function uk(n){return fl(n.viewCache_)}function ck(n,e){const r=Ir(n.viewCache_);return r&&(n.query._queryParams.loadsAllData()||!Z(e)&&!r.getImmediateChild(X(e)).isEmpty())?r.getChild(e):null}function Rm(n){return n.eventRegistrations_.length===0}function dk(n,e){n.eventRegistrations_.push(e)}function Pm(n,e,r){const s=[];if(r){D(e==null,"A cancel should cancel all event registrations.");const l=n.query._path;n.eventRegistrations_.forEach(u=>{const d=u.createCancelEvent(r,l);d&&s.push(d)})}if(e){let l=[];for(let u=0;u<n.eventRegistrations_.length;++u){const d=n.eventRegistrations_[u];if(!d.matches(e))l.push(d);else if(e.hasAnyCallback()){l=l.concat(n.eventRegistrations_.slice(u+1));break}}n.eventRegistrations_=l}else n.eventRegistrations_=[];return s}function Am(n,e,r,s){e.type===Kt.MERGE&&e.source.queryId!==null&&(D(Ir(n.viewCache_),"We should always have a full cache before handling merges"),D(fl(n.viewCache_),"Missing event cache, even though we have a server cache"));const l=n.viewCache_,u=tk(n.processor_,l,e,r,s);return ek(n.processor_,u.viewCache),D(u.viewCache.serverCache.isFullyInitialized()||!l.serverCache.isFullyInitialized(),"Once a server snap is complete, it should never go back"),n.viewCache_=u.viewCache,c_(n,u.changes,u.viewCache.eventCache.getNode(),null)}function hk(n,e){const r=n.viewCache_.eventCache,s=[];return r.getNode().isLeafNode()||r.getNode().forEachChild(ve,(u,d)=>{s.push(hi(u,d))}),r.isFullyInitialized()&&s.push(t_(r.getNode())),c_(n,s,r.getNode(),e)}function c_(n,e,r,s){const l=s?[s]:n.eventRegistrations_;return D2(n.eventGenerator_,e,r,l)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let _l;class d_{constructor(){this.views=new Map}}function fk(n){D(!_l,"__referenceConstructor has already been defined"),_l=n}function pk(){return D(_l,"Reference.ts has not been loaded"),_l}function mk(n){return n.views.size===0}function ad(n,e,r,s){const l=e.source.queryId;if(l!==null){const u=n.views.get(l);return D(u!=null,"SyncTree gave us an op for an invalid query."),Am(u,e,r,s)}else{let u=[];for(const d of n.views.values())u=u.concat(Am(d,e,r,s));return u}}function h_(n,e,r,s,l){const u=e._queryIdentifier,d=n.views.get(u);if(!d){let f=pl(r,l?s:null),m=!1;f?m=!0:s instanceof K?(f=sd(r,s),m=!1):(f=K.EMPTY_NODE,m=!1);const g=Nl(new Zn(f,m,!1),new Zn(s,l,!1));return new lk(e,g)}return d}function gk(n,e,r,s,l,u){const d=h_(n,e,s,l,u);return n.views.has(e._queryIdentifier)||n.views.set(e._queryIdentifier,d),dk(d,r),hk(d,r)}function _k(n,e,r,s){const l=e._queryIdentifier,u=[];let d=[];const f=Jn(n);if(l==="default")for(const[m,g]of n.views.entries())d=d.concat(Pm(g,r,s)),Rm(g)&&(n.views.delete(m),g.query._queryParams.loadsAllData()||u.push(g.query));else{const m=n.views.get(l);m&&(d=d.concat(Pm(m,r,s)),Rm(m)&&(n.views.delete(l),m.query._queryParams.loadsAllData()||u.push(m.query)))}return f&&!Jn(n)&&u.push(new(pk())(e._repo,e._path)),{removed:u,events:d}}function f_(n){const e=[];for(const r of n.views.values())r.query._queryParams.loadsAllData()||e.push(r);return e}function Gn(n,e){let r=null;for(const s of n.views.values())r=r||ck(s,e);return r}function p_(n,e){if(e._queryParams.loadsAllData())return Pl(n);{const s=e._queryIdentifier;return n.views.get(s)}}function m_(n,e){return p_(n,e)!=null}function Jn(n){return Pl(n)!=null}function Pl(n){for(const e of n.views.values())if(e.query._queryParams.loadsAllData())return e;return null}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let yl;function yk(n){D(!yl,"__referenceConstructor has already been defined"),yl=n}function vk(){return D(yl,"Reference.ts has not been loaded"),yl}let wk=1;class Mm{constructor(e){this.listenProvider_=e,this.syncPointTree_=new _e(null),this.pendingWriteTree_=G2(),this.tagToQueryMap=new Map,this.queryToTagMap=new Map}}function ud(n,e,r,s,l){return F2(n.pendingWriteTree_,e,r,s,l),l?vi(n,new Tr(nd(),e,r)):[]}function kk(n,e,r,s){U2(n.pendingWriteTree_,e,r,s);const l=_e.fromObject(r);return vi(n,new fi(nd(),e,l))}function qn(n,e,r=!1){const s=B2(n.pendingWriteTree_,e);if(z2(n.pendingWriteTree_,e)){let u=new _e(null);return s.snap!=null?u=u.set(le(),!0):qe(s.children,d=>{u=u.set(new ue(d),!0)}),vi(n,new hl(s.path,u,r))}else return[]}function Ds(n,e,r){return vi(n,new Tr(rd(),e,r))}function Ck(n,e,r){const s=_e.fromObject(r);return vi(n,new fi(rd(),e,s))}function Ek(n,e){return vi(n,new Ss(rd(),e))}function Sk(n,e,r){const s=cd(n,r);if(s){const l=dd(s),u=l.path,d=l.queryId,f=lt(u,e),m=new Ss(id(d),f);return hd(n,u,m)}else return[]}function vl(n,e,r,s,l=!1){const u=e._path,d=n.syncPointTree_.get(u);let f=[];if(d&&(e._queryIdentifier==="default"||m_(d,e))){const m=_k(d,e,r,s);mk(d)&&(n.syncPointTree_=n.syncPointTree_.remove(u));const g=m.removed;if(f=m.events,!l){const y=g.findIndex(k=>k._queryParams.loadsAllData())!==-1,w=n.syncPointTree_.findOnPath(u,(k,P)=>Jn(P));if(y&&!w){const k=n.syncPointTree_.subtree(u);if(!k.isEmpty()){const P=xk(k);for(let L=0;L<P.length;++L){const U=P[L],H=U.query,pe=v_(n,U);n.listenProvider_.startListening(gs(H),Ts(n,H),pe.hashFn,pe.onComplete)}}}!w&&g.length>0&&!s&&(y?n.listenProvider_.stopListening(gs(e),null):g.forEach(k=>{const P=n.queryToTagMap.get(Ml(k));n.listenProvider_.stopListening(gs(k),P)}))}Nk(n,g)}return f}function g_(n,e,r,s){const l=cd(n,s);if(l!=null){const u=dd(l),d=u.path,f=u.queryId,m=lt(d,e),g=new Tr(id(f),m,r);return hd(n,d,g)}else return[]}function Tk(n,e,r,s){const l=cd(n,s);if(l){const u=dd(l),d=u.path,f=u.queryId,m=lt(d,e),g=_e.fromObject(r),y=new fi(id(f),m,g);return hd(n,d,y)}else return[]}function Mc(n,e,r,s=!1){const l=e._path;let u=null,d=!1;n.syncPointTree_.foreachOnPath(l,(k,P)=>{const L=lt(k,l);u=u||Gn(P,L),d=d||Jn(P)});let f=n.syncPointTree_.get(l);f?(d=d||Jn(f),u=u||Gn(f,le())):(f=new d_,n.syncPointTree_=n.syncPointTree_.set(l,f));let m;u!=null?m=!0:(m=!1,u=K.EMPTY_NODE,n.syncPointTree_.subtree(l).foreachChild((P,L)=>{const U=Gn(L,le());U&&(u=u.updateImmediateChild(P,U))}));const g=m_(f,e);if(!g&&!e._queryParams.loadsAllData()){const k=Ml(e);D(!n.queryToTagMap.has(k),"View does not exist, but we have a tag");const P=Rk();n.queryToTagMap.set(k,P),n.tagToQueryMap.set(P,k)}const y=Rl(n.pendingWriteTree_,l);let w=gk(f,e,r,y,u,m);if(!g&&!d&&!s){const k=p_(f,e);w=w.concat(Pk(n,e,k))}return w}function Al(n,e,r){const l=n.pendingWriteTree_,u=n.syncPointTree_.findOnPath(e,(d,f)=>{const m=lt(d,e),g=Gn(f,m);if(g)return g});return s_(l,e,u,r,!0)}function Ik(n,e){const r=e._path;let s=null;n.syncPointTree_.foreachOnPath(r,(g,y)=>{const w=lt(g,r);s=s||Gn(y,w)});let l=n.syncPointTree_.get(r);l?s=s||Gn(l,le()):(l=new d_,n.syncPointTree_=n.syncPointTree_.set(r,l));const u=s!=null,d=u?new Zn(s,!0,!1):null,f=Rl(n.pendingWriteTree_,e._path),m=h_(l,e,f,u?d.getNode():K.EMPTY_NODE,u);return uk(m)}function vi(n,e){return __(e,n.syncPointTree_,null,Rl(n.pendingWriteTree_,le()))}function __(n,e,r,s){if(Z(n.path))return y_(n,e,r,s);{const l=e.get(le());r==null&&l!=null&&(r=Gn(l,le()));let u=[];const d=X(n.path),f=n.operationForChild(d),m=e.children.get(d);if(m&&f){const g=r?r.getImmediateChild(d):null,y=o_(s,d);u=u.concat(__(f,m,g,y))}return l&&(u=u.concat(ad(l,n,s,r))),u}}function y_(n,e,r,s){const l=e.get(le());r==null&&l!=null&&(r=Gn(l,le()));let u=[];return e.children.inorderTraversal((d,f)=>{const m=r?r.getImmediateChild(d):null,g=o_(s,d),y=n.operationForChild(d);y&&(u=u.concat(y_(y,f,m,g)))}),l&&(u=u.concat(ad(l,n,s,r))),u}function v_(n,e){const r=e.query,s=Ts(n,r);return{hashFn:()=>(ak(e)||K.EMPTY_NODE).hash(),onComplete:l=>{if(l==="ok")return s?Sk(n,r._path,s):Ek(n,r._path);{const u=kw(l,r);return vl(n,r,null,u)}}}}function Ts(n,e){const r=Ml(e);return n.queryToTagMap.get(r)}function Ml(n){return n._path.toString()+"$"+n._queryIdentifier}function cd(n,e){return n.tagToQueryMap.get(e)}function dd(n){const e=n.indexOf("$");return D(e!==-1&&e<n.length-1,"Bad queryKey."),{queryId:n.substr(e+1),path:new ue(n.substr(0,e))}}function hd(n,e,r){const s=n.syncPointTree_.get(e);D(s,"Missing sync point for query tag that we're tracking");const l=Rl(n.pendingWriteTree_,e);return ad(s,r,l,null)}function xk(n){return n.fold((e,r,s)=>{if(r&&Jn(r))return[Pl(r)];{let l=[];return r&&(l=f_(r)),qe(s,(u,d)=>{l=l.concat(d)}),l}})}function gs(n){return n._queryParams.loadsAllData()&&!n._queryParams.isDefault()?new(vk())(n._repo,n._path):n}function Nk(n,e){for(let r=0;r<e.length;++r){const s=e[r];if(!s._queryParams.loadsAllData()){const l=Ml(s),u=n.queryToTagMap.get(l);n.queryToTagMap.delete(l),n.tagToQueryMap.delete(u)}}}function Rk(){return wk++}function Pk(n,e,r){const s=e._path,l=Ts(n,e),u=v_(n,r),d=n.listenProvider_.startListening(gs(e),l,u.hashFn,u.onComplete),f=n.syncPointTree_.subtree(s);if(l)D(!Jn(f.value),"If we're adding a query, it shouldn't be shadowed");else{const m=f.fold((g,y,w)=>{if(!Z(g)&&y&&Jn(y))return[Pl(y).query];{let k=[];return y&&(k=k.concat(f_(y).map(P=>P.query))),qe(w,(P,L)=>{k=k.concat(L)}),k}});for(let g=0;g<m.length;++g){const y=m[g];n.listenProvider_.stopListening(gs(y),Ts(n,y))}}return d}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fd{constructor(e){this.node_=e}getImmediateChild(e){const r=this.node_.getImmediateChild(e);return new fd(r)}node(){return this.node_}}class pd{constructor(e,r){this.syncTree_=e,this.path_=r}getImmediateChild(e){const r=Se(this.path_,e);return new pd(this.syncTree_,r)}node(){return Al(this.syncTree_,this.path_)}}const Ak=function(n){return n=n||{},n.timestamp=n.timestamp||new Date().getTime(),n},Dm=function(n,e,r){if(!n||typeof n!="object")return n;if(D(".sv"in n,"Unexpected leaf node or priority contents"),typeof n[".sv"]=="string")return Mk(n[".sv"],e,r);if(typeof n[".sv"]=="object")return Dk(n[".sv"],e);D(!1,"Unexpected server value: "+JSON.stringify(n,null,2))},Mk=function(n,e,r){switch(n){case"timestamp":return r.timestamp;default:D(!1,"Unexpected server value: "+n)}},Dk=function(n,e,r){n.hasOwnProperty("increment")||D(!1,"Unexpected server value: "+JSON.stringify(n,null,2));const s=n.increment;typeof s!="number"&&D(!1,"Unexpected increment value: "+s);const l=e.node();if(D(l!==null&&typeof l<"u","Expected ChildrenNode.EMPTY_NODE for nulls"),!l.isLeafNode())return s;const d=l.getValue();return typeof d!="number"?s:d+s},w_=function(n,e,r,s){return gd(e,new pd(r,n),s)},md=function(n,e,r){return gd(n,new fd(e),r)};function gd(n,e,r){const s=n.getPriority().val(),l=Dm(s,e.getImmediateChild(".priority"),r);let u;if(n.isLeafNode()){const d=n,f=Dm(d.getValue(),e,r);return f!==d.getValue()||l!==d.getPriority().val()?new Ve(f,xe(l)):n}else{const d=n;return u=d,l!==d.getPriority().val()&&(u=u.updatePriority(new Ve(l))),d.forEachChild(ve,(f,m)=>{const g=gd(m,e.getImmediateChild(f),r);g!==m&&(u=u.updateImmediateChild(f,g))}),u}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _d{constructor(e="",r=null,s={children:{},childCount:0}){this.name=e,this.parent=r,this.node=s}}function Dl(n,e){let r=e instanceof ue?e:new ue(e),s=n,l=X(r);for(;l!==null;){const u=Er(s.node.children,l)||{children:{},childCount:0};s=new _d(l,s,u),r=fe(r),l=X(r)}return s}function Lr(n){return n.node.value}function yd(n,e){n.node.value=e,Dc(n)}function k_(n){return n.node.childCount>0}function Ok(n){return Lr(n)===void 0&&!k_(n)}function Ol(n,e){qe(n.node.children,(r,s)=>{e(new _d(r,n,s))})}function C_(n,e,r,s){r&&e(n),Ol(n,l=>{C_(l,e,!0)})}function Lk(n,e,r){let s=n.parent;for(;s!==null;){if(e(s))return!0;s=s.parent}return!1}function Os(n){return new ue(n.parent===null?n.name:Os(n.parent)+"/"+n.name)}function Dc(n){n.parent!==null&&bk(n.parent,n.name,n)}function bk(n,e,r){const s=Ok(r),l=Yt(n.node.children,e);s&&l?(delete n.node.children[e],n.node.childCount--,Dc(n)):!s&&!l&&(n.node.children[e]=r.node,n.node.childCount++,Dc(n))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Fk=/[\[\].#$\/\u0000-\u001F\u007F]/,Uk=/[\[\].#$\u0000-\u001F\u007F]/,nc=10*1024*1024,Ll=function(n){return typeof n=="string"&&n.length!==0&&!Fk.test(n)},E_=function(n){return typeof n=="string"&&n.length!==0&&!Uk.test(n)},Bk=function(n){return n&&(n=n.replace(/^\/*\.info(\/|$)/,"/")),E_(n)},Is=function(n){return n===null||typeof n=="string"||typeof n=="number"&&!Sl(n)||n&&typeof n=="object"&&Yt(n,".sv")},an=function(n,e,r,s){s&&e===void 0||Ls(Sr(n,"value"),e,r)},Ls=function(n,e,r){const s=r instanceof ue?new t2(r,n):r;if(e===void 0)throw new Error(n+"contains undefined "+yr(s));if(typeof e=="function")throw new Error(n+"contains a function "+yr(s)+" with contents = "+e.toString());if(Sl(e))throw new Error(n+"contains "+e.toString()+" "+yr(s));if(typeof e=="string"&&e.length>nc/3&&Cl(e)>nc)throw new Error(n+"contains a string greater than "+nc+" utf8 bytes "+yr(s)+" ('"+e.substring(0,50)+"...')");if(e&&typeof e=="object"){let l=!1,u=!1;if(qe(e,(d,f)=>{if(d===".value")l=!0;else if(d!==".priority"&&d!==".sv"&&(u=!0,!Ll(d)))throw new Error(n+" contains an invalid key ("+d+") "+yr(s)+`.  Keys must be non-empty strings and can't contain ".", "#", "$", "/", "[", or "]"`);n2(s,d),Ls(n,f,s),r2(s)}),l&&u)throw new Error(n+' contains ".value" child '+yr(s)+" in addition to actual children.")}},zk=function(n,e){let r,s;for(r=0;r<e.length;r++){s=e[r];const u=ws(s);for(let d=0;d<u.length;d++)if(!(u[d]===".priority"&&d===u.length-1)){if(!Ll(u[d]))throw new Error(n+"contains an invalid key ("+u[d]+") in path "+s.toString()+`. Keys must be non-empty strings and can't contain ".", "#", "$", "/", "[", or "]"`)}}e.sort(e2);let l=null;for(r=0;r<e.length;r++){if(s=e[r],l!==null&&Dt(l,s))throw new Error(n+"contains a path "+l.toString()+" that is ancestor of another path "+s.toString());l=s}},S_=function(n,e,r,s){const l=Sr(n,"values");if(!(e&&typeof e=="object")||Array.isArray(e))throw new Error(l+" must be an object containing the children to replace.");const u=[];qe(e,(d,f)=>{const m=new ue(d);if(Ls(l,f,Se(r,m)),Gc(m)===".priority"&&!Is(f))throw new Error(l+"contains an invalid value for '"+m.toString()+"', which must be a valid Firebase priority (a string, finite number, server value, or null).");u.push(m)}),zk(l,u)},vd=function(n,e,r){if(Sl(e))throw new Error(Sr(n,"priority")+"is "+e.toString()+", but must be a valid Firebase priority (a string, finite number, server value, or null).");if(!Is(e))throw new Error(Sr(n,"priority")+"must be a valid Firebase priority (a string, finite number, server value, or null).")},bs=function(n,e,r,s){if(r!==void 0&&!Ll(r))throw new Error(Sr(n,e)+'was an invalid key = "'+r+`".  Firebase keys must be non-empty strings and can't contain ".", "#", "$", "/", "[", or "]").`)},bl=function(n,e,r,s){if(!(s&&r===void 0)&&!E_(r))throw new Error(Sr(n,e)+'was an invalid path = "'+r+`". Paths must be non-empty strings and can't contain ".", "#", "$", "[", or "]"`)},jk=function(n,e,r,s){r&&(r=r.replace(/^\/*\.info(\/|$)/,"/")),bl(n,e,r,s)},Qt=function(n,e){if(X(e)===".info")throw new Error(n+" failed = Can't modify data under /.info/")},T_=function(n,e){const r=e.path.toString();if(typeof e.repoInfo.host!="string"||e.repoInfo.host.length===0||!Ll(e.repoInfo.namespace)&&e.repoInfo.host.split(":")[0]!=="localhost"||r.length!==0&&!Bk(r))throw new Error(Sr(n,"url")+`must be a valid firebase URL and the path can't contain ".", "#", "$", "[", or "]".`)};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Hk{constructor(){this.eventLists_=[],this.recursionDepth_=0}}function Fl(n,e){let r=null;for(let s=0;s<e.length;s++){const l=e[s],u=l.getPath();r!==null&&!Yc(u,r.path)&&(n.eventLists_.push(r),r=null),r===null&&(r={events:[],path:u}),r.events.push(l)}r&&n.eventLists_.push(r)}function I_(n,e,r){Fl(n,r),x_(n,s=>Yc(s,e))}function Tt(n,e,r){Fl(n,r),x_(n,s=>Dt(s,e)||Dt(e,s))}function x_(n,e){n.recursionDepth_++;let r=!0;for(let s=0;s<n.eventLists_.length;s++){const l=n.eventLists_[s];if(l){const u=l.path;e(u)?(Vk(n.eventLists_[s]),n.eventLists_[s]=null):r=!1}}r&&(n.eventLists_=[]),n.recursionDepth_--}function Vk(n){for(let e=0;e<n.events.length;e++){const r=n.events[e];if(r!==null){n.events[e]=null;const s=r.getEventRunner();kr&&$e("event: "+r.toString()),_i(s)}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const N_="repo_interrupt",Wk=25;class $k{constructor(e,r,s,l){this.repoInfo_=e,this.forceRestClient_=r,this.authTokenProvider_=s,this.appCheckProvider_=l,this.dataUpdateCount=0,this.statsListener_=null,this.eventQueue_=new Hk,this.nextWriteId_=1,this.interceptServerDataCallback_=null,this.onDisconnect_=dl(),this.transactionQueueTree_=new _d,this.persistentConnection_=null,this.key=this.repoInfo_.toURLString()}toString(){return(this.repoInfo_.secure?"https://":"http://")+this.repoInfo_.host}}function qk(n,e,r){if(n.stats_=Kc(n.repoInfo_),n.forceRestClient_||Tw())n.server_=new cl(n.repoInfo_,(s,l,u,d)=>{Om(n,s,l,u,d)},n.authTokenProvider_,n.appCheckProvider_),setTimeout(()=>Lm(n,!0),0);else{if(typeof r<"u"&&r!==null){if(typeof r!="object")throw new Error("Only objects are supported for option databaseAuthVariableOverride");try{Be(r)}catch(s){throw new Error("Invalid authOverride provided: "+s)}}n.persistentConnection_=new Lt(n.repoInfo_,e,(s,l,u,d)=>{Om(n,s,l,u,d)},s=>{Lm(n,s)},s=>{Kk(n,s)},n.authTokenProvider_,n.appCheckProvider_,r),n.server_=n.persistentConnection_}n.authTokenProvider_.addTokenChangeListener(s=>{n.server_.refreshAuthToken(s)}),n.appCheckProvider_.addTokenChangeListener(s=>{n.server_.refreshAppCheckToken(s.token)}),n.statsReporter_=Pw(n.repoInfo_,()=>new A2(n.stats_,n.server_)),n.infoData_=new I2,n.infoSyncTree_=new Mm({startListening:(s,l,u,d)=>{let f=[];const m=n.infoData_.getNode(s._path);return m.isEmpty()||(f=Ds(n.infoSyncTree_,s._path,m),setTimeout(()=>{d("ok")},0)),f},stopListening:()=>{}}),wd(n,"connected",!1),n.serverSyncTree_=new Mm({startListening:(s,l,u,d)=>(n.server_.listen(s,u,l,(f,m)=>{const g=d(f,m);Tt(n.eventQueue_,s._path,g)}),[]),stopListening:(s,l)=>{n.server_.unlisten(s,l)}})}function R_(n){const r=n.infoData_.getNode(new ue(".info/serverTimeOffset")).val()||0;return new Date().getTime()+r}function Fs(n){return Ak({timestamp:R_(n)})}function Om(n,e,r,s,l){n.dataUpdateCount++;const u=new ue(e);r=n.interceptServerDataCallback_?n.interceptServerDataCallback_(e,r):r;let d=[];if(l)if(s){const m=il(r,g=>xe(g));d=Tk(n.serverSyncTree_,u,m,l)}else{const m=xe(r);d=g_(n.serverSyncTree_,u,m,l)}else if(s){const m=il(r,g=>xe(g));d=Ck(n.serverSyncTree_,u,m)}else{const m=xe(r);d=Ds(n.serverSyncTree_,u,m)}let f=u;d.length>0&&(f=mi(n,u)),Tt(n.eventQueue_,f,d)}function Lm(n,e){wd(n,"connected",e),e===!1&&Yk(n)}function Kk(n,e){qe(e,(r,s)=>{wd(n,r,s)})}function wd(n,e,r){const s=new ue("/.info/"+e),l=xe(r);n.infoData_.updateSnapshot(s,l);const u=Ds(n.infoSyncTree_,s,l);Tt(n.eventQueue_,s,u)}function Ul(n){return n.nextWriteId_++}function Qk(n,e,r){const s=Ik(n.serverSyncTree_,e);return s!=null?Promise.resolve(s):n.server_.get(e).then(l=>{const u=xe(l).withIndex(e._queryParams.getIndex());Mc(n.serverSyncTree_,e,r,!0);let d;if(e._queryParams.loadsAllData())d=Ds(n.serverSyncTree_,e._path,u);else{const f=Ts(n.serverSyncTree_,e);d=g_(n.serverSyncTree_,e._path,u,f)}return Tt(n.eventQueue_,e._path,d),vl(n.serverSyncTree_,e,r,null,!0),u},l=>(wi(n,"get for query "+Be(e)+" failed: "+l),Promise.reject(new Error(l))))}function kd(n,e,r,s,l){wi(n,"set",{path:e.toString(),value:r,priority:s});const u=Fs(n),d=xe(r,s),f=Al(n.serverSyncTree_,e),m=md(d,f,u),g=Ul(n),y=ud(n.serverSyncTree_,e,m,g,!0);Fl(n.eventQueue_,y),n.server_.put(e.toString(),d.val(!0),(k,P)=>{const L=k==="ok";L||nt("set at "+e+" failed: "+k);const U=qn(n.serverSyncTree_,g,!L);Tt(n.eventQueue_,e,U),er(n,l,k,P)});const w=Ed(n,e);mi(n,w),Tt(n.eventQueue_,w,[])}function Gk(n,e,r,s){wi(n,"update",{path:e.toString(),value:r});let l=!0;const u=Fs(n),d={};if(qe(r,(f,m)=>{l=!1,d[f]=w_(Se(e,f),xe(m),n.serverSyncTree_,u)}),l)$e("update() called with empty data.  Don't do anything."),er(n,s,"ok",void 0);else{const f=Ul(n),m=kk(n.serverSyncTree_,e,d,f);Fl(n.eventQueue_,m),n.server_.merge(e.toString(),r,(g,y)=>{const w=g==="ok";w||nt("update at "+e+" failed: "+g);const k=qn(n.serverSyncTree_,f,!w),P=k.length>0?mi(n,e):e;Tt(n.eventQueue_,P,k),er(n,s,g,y)}),qe(r,g=>{const y=Ed(n,Se(e,g));mi(n,y)}),Tt(n.eventQueue_,e,[])}}function Yk(n){wi(n,"onDisconnectEvents");const e=Fs(n),r=dl();Ic(n.onDisconnect_,le(),(l,u)=>{const d=w_(l,u,n.serverSyncTree_,e);yi(r,l,d)});let s=[];Ic(r,le(),(l,u)=>{s=s.concat(Ds(n.serverSyncTree_,l,u));const d=Ed(n,l);mi(n,d)}),n.onDisconnect_=dl(),Tt(n.eventQueue_,le(),s)}function Xk(n,e,r){n.server_.onDisconnectCancel(e.toString(),(s,l)=>{s==="ok"&&Tc(n.onDisconnect_,e),er(n,r,s,l)})}function bm(n,e,r,s){const l=xe(r);n.server_.onDisconnectPut(e.toString(),l.val(!0),(u,d)=>{u==="ok"&&yi(n.onDisconnect_,e,l),er(n,s,u,d)})}function Zk(n,e,r,s,l){const u=xe(r,s);n.server_.onDisconnectPut(e.toString(),u.val(!0),(d,f)=>{d==="ok"&&yi(n.onDisconnect_,e,u),er(n,l,d,f)})}function Jk(n,e,r,s){if(hc(r)){$e("onDisconnect().update() called with empty data.  Don't do anything."),er(n,s,"ok",void 0);return}n.server_.onDisconnectMerge(e.toString(),r,(l,u)=>{l==="ok"&&qe(r,(d,f)=>{const m=xe(f);yi(n.onDisconnect_,Se(e,d),m)}),er(n,s,l,u)})}function eC(n,e,r){let s;X(e._path)===".info"?s=Mc(n.infoSyncTree_,e,r):s=Mc(n.serverSyncTree_,e,r),I_(n.eventQueue_,e._path,s)}function Oc(n,e,r){let s;X(e._path)===".info"?s=vl(n.infoSyncTree_,e,r):s=vl(n.serverSyncTree_,e,r),I_(n.eventQueue_,e._path,s)}function P_(n){n.persistentConnection_&&n.persistentConnection_.interrupt(N_)}function tC(n){n.persistentConnection_&&n.persistentConnection_.resume(N_)}function wi(n,...e){let r="";n.persistentConnection_&&(r=n.persistentConnection_.id+":"),$e(r,...e)}function er(n,e,r,s){e&&_i(()=>{if(r==="ok")e(null);else{const l=(r||"error").toUpperCase();let u=l;s&&(u+=": "+s);const d=new Error(u);d.code=l,e(d)}})}function nC(n,e,r,s,l,u){wi(n,"transaction on "+e);const d={path:e,update:r,onComplete:s,status:null,order:Tg(),applyLocally:u,retryCount:0,unwatcher:l,abortReason:null,currentWriteId:null,currentInputSnapshot:null,currentOutputSnapshotRaw:null,currentOutputSnapshotResolved:null},f=Cd(n,e,void 0);d.currentInputSnapshot=f;const m=d.update(f.val());if(m===void 0)d.unwatcher(),d.currentOutputSnapshotRaw=null,d.currentOutputSnapshotResolved=null,d.onComplete&&d.onComplete(null,!1,d.currentInputSnapshot);else{Ls("transaction failed: Data returned ",m,d.path),d.status=0;const g=Dl(n.transactionQueueTree_,e),y=Lr(g)||[];y.push(d),yd(g,y);let w;typeof m=="object"&&m!==null&&Yt(m,".priority")?(w=Er(m,".priority"),D(Is(w),"Invalid priority returned by transaction. Priority must be a valid string, finite number, server value, or null.")):w=(Al(n.serverSyncTree_,e)||K.EMPTY_NODE).getPriority().val();const k=Fs(n),P=xe(m,w),L=md(P,f,k);d.currentOutputSnapshotRaw=P,d.currentOutputSnapshotResolved=L,d.currentWriteId=Ul(n);const U=ud(n.serverSyncTree_,e,L,d.currentWriteId,d.applyLocally);Tt(n.eventQueue_,e,U),Bl(n,n.transactionQueueTree_)}}function Cd(n,e,r){return Al(n.serverSyncTree_,e,r)||K.EMPTY_NODE}function Bl(n,e=n.transactionQueueTree_){if(e||zl(n,e),Lr(e)){const r=M_(n,e);D(r.length>0,"Sending zero length transaction queue"),r.every(l=>l.status===0)&&rC(n,Os(e),r)}else k_(e)&&Ol(e,r=>{Bl(n,r)})}function rC(n,e,r){const s=r.map(g=>g.currentWriteId),l=Cd(n,e,s);let u=l;const d=l.hash();for(let g=0;g<r.length;g++){const y=r[g];D(y.status===0,"tryToSendTransactionQueue_: items in queue should all be run."),y.status=1,y.retryCount++;const w=lt(e,y.path);u=u.updateChild(w,y.currentOutputSnapshotRaw)}const f=u.val(!0),m=e;n.server_.put(m.toString(),f,g=>{wi(n,"transaction put response",{path:m.toString(),status:g});let y=[];if(g==="ok"){const w=[];for(let k=0;k<r.length;k++)r[k].status=2,y=y.concat(qn(n.serverSyncTree_,r[k].currentWriteId)),r[k].onComplete&&w.push(()=>r[k].onComplete(null,!0,r[k].currentOutputSnapshotResolved)),r[k].unwatcher();zl(n,Dl(n.transactionQueueTree_,e)),Bl(n,n.transactionQueueTree_),Tt(n.eventQueue_,e,y);for(let k=0;k<w.length;k++)_i(w[k])}else{if(g==="datastale")for(let w=0;w<r.length;w++)r[w].status===3?r[w].status=4:r[w].status=0;else{nt("transaction at "+m.toString()+" failed: "+g);for(let w=0;w<r.length;w++)r[w].status=4,r[w].abortReason=g}mi(n,e)}},d)}function mi(n,e){const r=A_(n,e),s=Os(r),l=M_(n,r);return iC(n,l,s),s}function iC(n,e,r){if(e.length===0)return;const s=[];let l=[];const d=e.filter(f=>f.status===0).map(f=>f.currentWriteId);for(let f=0;f<e.length;f++){const m=e[f],g=lt(r,m.path);let y=!1,w;if(D(g!==null,"rerunTransactionsUnderNode_: relativePath should not be null."),m.status===4)y=!0,w=m.abortReason,l=l.concat(qn(n.serverSyncTree_,m.currentWriteId,!0));else if(m.status===0)if(m.retryCount>=Wk)y=!0,w="maxretry",l=l.concat(qn(n.serverSyncTree_,m.currentWriteId,!0));else{const k=Cd(n,m.path,d);m.currentInputSnapshot=k;const P=e[f].update(k.val());if(P!==void 0){Ls("transaction failed: Data returned ",P,m.path);let L=xe(P);typeof P=="object"&&P!=null&&Yt(P,".priority")||(L=L.updatePriority(k.getPriority()));const H=m.currentWriteId,pe=Fs(n),he=md(L,k,pe);m.currentOutputSnapshotRaw=L,m.currentOutputSnapshotResolved=he,m.currentWriteId=Ul(n),d.splice(d.indexOf(H),1),l=l.concat(ud(n.serverSyncTree_,m.path,he,m.currentWriteId,m.applyLocally)),l=l.concat(qn(n.serverSyncTree_,H,!0))}else y=!0,w="nodata",l=l.concat(qn(n.serverSyncTree_,m.currentWriteId,!0))}Tt(n.eventQueue_,r,l),l=[],y&&(e[f].status=2,(function(k){setTimeout(k,Math.floor(0))})(e[f].unwatcher),e[f].onComplete&&(w==="nodata"?s.push(()=>e[f].onComplete(null,!1,e[f].currentInputSnapshot)):s.push(()=>e[f].onComplete(new Error(w),!1,null))))}zl(n,n.transactionQueueTree_);for(let f=0;f<s.length;f++)_i(s[f]);Bl(n,n.transactionQueueTree_)}function A_(n,e){let r,s=n.transactionQueueTree_;for(r=X(e);r!==null&&Lr(s)===void 0;)s=Dl(s,r),e=fe(e),r=X(e);return s}function M_(n,e){const r=[];return D_(n,e,r),r.sort((s,l)=>s.order-l.order),r}function D_(n,e,r){const s=Lr(e);if(s)for(let l=0;l<s.length;l++)r.push(s[l]);Ol(e,l=>{D_(n,l,r)})}function zl(n,e){const r=Lr(e);if(r){let s=0;for(let l=0;l<r.length;l++)r[l].status!==2&&(r[s]=r[l],s++);r.length=s,yd(e,r.length>0?r:void 0)}Ol(e,s=>{zl(n,s)})}function Ed(n,e){const r=Os(A_(n,e)),s=Dl(n.transactionQueueTree_,e);return Lk(s,l=>{rc(n,l)}),rc(n,s),C_(s,l=>{rc(n,l)}),r}function rc(n,e){const r=Lr(e);if(r){const s=[];let l=[],u=-1;for(let d=0;d<r.length;d++)r[d].status===3||(r[d].status===1?(D(u===d-1,"All SENT items should be at beginning of queue."),u=d,r[d].status=3,r[d].abortReason="set"):(D(r[d].status===0,"Unexpected transaction status in abort"),r[d].unwatcher(),l=l.concat(qn(n.serverSyncTree_,r[d].currentWriteId,!0)),r[d].onComplete&&s.push(r[d].onComplete.bind(null,new Error("set"),!1,null))));u===-1?yd(e,void 0):r.length=u+1,Tt(n.eventQueue_,Os(e),l);for(let d=0;d<s.length;d++)_i(s[d])}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function sC(n){let e="";const r=n.split("/");for(let s=0;s<r.length;s++)if(r[s].length>0){let l=r[s];try{l=decodeURIComponent(l.replace(/\+/g," "))}catch{}e+="/"+l}return e}function oC(n){const e={};n.charAt(0)==="?"&&(n=n.substring(1));for(const r of n.split("&")){if(r.length===0)continue;const s=r.split("=");s.length===2?e[decodeURIComponent(s[0])]=decodeURIComponent(s[1]):nt(`Invalid query segment '${r}' in query '${n}'`)}return e}const Lc=function(n,e){const r=lC(n),s=r.namespace;r.domain==="firebase.com"&&ln(r.host+" is no longer supported. Please use <YOUR FIREBASE>.firebaseio.com instead"),(!s||s==="undefined")&&r.domain!=="localhost"&&ln("Cannot parse Firebase url. Please use https://<YOUR FIREBASE>.firebaseio.com"),r.secure||gw();const l=r.scheme==="ws"||r.scheme==="wss";return{repoInfo:new Bg(r.host,r.secure,s,l,e,"",s!==r.subdomain),path:new ue(r.pathString)}},lC=function(n){let e="",r="",s="",l="",u="",d=!0,f="https",m=443;if(typeof n=="string"){let g=n.indexOf("//");g>=0&&(f=n.substring(0,g-1),n=n.substring(g+2));let y=n.indexOf("/");y===-1&&(y=n.length);let w=n.indexOf("?");w===-1&&(w=n.length),e=n.substring(0,Math.min(y,w)),y<w&&(l=sC(n.substring(y,w)));const k=oC(n.substring(Math.min(n.length,w)));g=e.indexOf(":"),g>=0?(d=f==="https"||f==="wss",m=parseInt(e.substring(g+1),10)):g=e.length;const P=e.slice(0,g);if(P.toLowerCase()==="localhost")r="localhost";else if(P.split(".").length<=2)r=P;else{const L=e.indexOf(".");s=e.substring(0,L).toLowerCase(),r=e.substring(L+1),u=s}"ns"in k&&(u=k.ns)}return{host:e,port:m,domain:r,subdomain:s,secure:d,scheme:f,pathString:l,namespace:u}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Fm="-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz",aC=(function(){let n=0;const e=[];return function(r){const s=r===n;n=r;let l;const u=new Array(8);for(l=7;l>=0;l--)u[l]=Fm.charAt(r%64),r=Math.floor(r/64);D(r===0,"Cannot push at time == 0");let d=u.join("");if(s){for(l=11;l>=0&&e[l]===63;l--)e[l]=0;e[l]++}else for(l=0;l<12;l++)e[l]=Math.floor(Math.random()*64);for(l=0;l<12;l++)d+=Fm.charAt(e[l]);return D(d.length===20,"nextPushId: Length should be 20."),d}})();/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class O_{constructor(e,r,s,l){this.eventType=e,this.eventRegistration=r,this.snapshot=s,this.prevName=l}getPath(){const e=this.snapshot.ref;return this.eventType==="value"?e._path:e.parent._path}getEventType(){return this.eventType}getEventRunner(){return this.eventRegistration.getEventRunner(this)}toString(){return this.getPath().toString()+":"+this.eventType+":"+Be(this.snapshot.exportVal())}}class L_{constructor(e,r,s){this.eventRegistration=e,this.error=r,this.path=s}getPath(){return this.path}getEventType(){return"cancel"}getEventRunner(){return this.eventRegistration.getEventRunner(this)}toString(){return this.path.toString()+":cancel"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sd{constructor(e,r){this.snapshotCallback=e,this.cancelCallback=r}onValue(e,r){this.snapshotCallback.call(null,e,r)}onCancel(e){return D(this.hasCancelCallback,"Raising a cancel event on a listener with no cancel callback"),this.cancelCallback.call(null,e)}get hasCancelCallback(){return!!this.cancelCallback}matches(e){return this.snapshotCallback===e.snapshotCallback||this.snapshotCallback.userCallback!==void 0&&this.snapshotCallback.userCallback===e.snapshotCallback.userCallback&&this.snapshotCallback.context===e.snapshotCallback.context}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class b_{constructor(e,r){this._repo=e,this._path=r}cancel(){const e=new St;return Xk(this._repo,this._path,e.wrapCallback(()=>{})),e.promise}remove(){Qt("OnDisconnect.remove",this._path);const e=new St;return bm(this._repo,this._path,null,e.wrapCallback(()=>{})),e.promise}set(e){Qt("OnDisconnect.set",this._path),an("OnDisconnect.set",e,this._path,!1);const r=new St;return bm(this._repo,this._path,e,r.wrapCallback(()=>{})),r.promise}setWithPriority(e,r){Qt("OnDisconnect.setWithPriority",this._path),an("OnDisconnect.setWithPriority",e,this._path,!1),vd("OnDisconnect.setWithPriority",r);const s=new St;return Zk(this._repo,this._path,e,r,s.wrapCallback(()=>{})),s.promise}update(e){Qt("OnDisconnect.update",this._path),S_("OnDisconnect.update",e,this._path);const r=new St;return Jk(this._repo,this._path,e,r.wrapCallback(()=>{})),r.promise}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _t{constructor(e,r,s,l){this._repo=e,this._path=r,this._queryParams=s,this._orderByCalled=l}get key(){return Z(this._path)?null:Gc(this._path)}get ref(){return new Ft(this._repo,this._path)}get _queryIdentifier(){const e=Cm(this._queryParams),r=$c(e);return r==="{}"?"default":r}get _queryObject(){return Cm(this._queryParams)}isEqual(e){if(e=Ne(e),!(e instanceof _t))return!1;const r=this._repo===e._repo,s=Yc(this._path,e._path),l=this._queryIdentifier===e._queryIdentifier;return r&&s&&l}toJSON(){return this.toString()}toString(){return this._repo.toString()+Jw(this._path)}}function jl(n,e){if(n._orderByCalled===!0)throw new Error(e+": You can't combine multiple orderBy calls.")}function nr(n){let e=null,r=null;if(n.hasStart()&&(e=n.getIndexStartValue()),n.hasEnd()&&(r=n.getIndexEndValue()),n.getIndex()===on){const s="Query: When ordering by key, you may only pass one argument to startAt(), endAt(), or equalTo().",l="Query: When ordering by key, the argument passed to startAt(), startAfter(), endAt(), endBefore(), or equalTo() must be a string.";if(n.hasStart()){if(n.getIndexStartName()!==Yn)throw new Error(s);if(typeof e!="string")throw new Error(l)}if(n.hasEnd()){if(n.getIndexEndName()!==En)throw new Error(s);if(typeof r!="string")throw new Error(l)}}else if(n.getIndex()===ve){if(e!=null&&!Is(e)||r!=null&&!Is(r))throw new Error("Query: When ordering by priority, the first argument passed to startAt(), startAfter() endAt(), endBefore(), or equalTo() must be a valid priority value (null, a number, or a string).")}else if(D(n.getIndex()instanceof Jc||n.getIndex()===ed,"unknown index type."),e!=null&&typeof e=="object"||r!=null&&typeof r=="object")throw new Error("Query: First argument passed to startAt(), startAfter(), endAt(), endBefore(), or equalTo() cannot be an object.")}function Hl(n){if(n.hasStart()&&n.hasEnd()&&n.hasLimit()&&!n.hasAnchoredLimit())throw new Error("Query: Can't combine startAt(), startAfter(), endAt(), endBefore(), and limit(). Use limitToFirst() or limitToLast() instead.")}class Ft extends _t{constructor(e,r){super(e,r,new Il,!1)}get parent(){const e=Qg(this._path);return e===null?null:new Ft(this._repo,e)}get root(){let e=this;for(;e.parent!==null;)e=e.parent;return e}}class tr{constructor(e,r,s){this._node=e,this.ref=r,this._index=s}get priority(){return this._node.getPriority().val()}get key(){return this.ref.key}get size(){return this._node.numChildren()}child(e){const r=new ue(e),s=xr(this.ref,e);return new tr(this._node.getChild(r),s,ve)}exists(){return!this._node.isEmpty()}exportVal(){return this._node.val(!0)}forEach(e){return this._node.isLeafNode()?!1:!!this._node.forEachChild(this._index,(s,l)=>e(new tr(l,xr(this.ref,s),ve)))}hasChild(e){const r=new ue(e);return!this._node.getChild(r).isEmpty()}hasChildren(){return this._node.isLeafNode()?!1:!this._node.isEmpty()}toJSON(){return this.exportVal()}val(){return this._node.val()}}function F_(n,e){return n=Ne(n),n._checkNotDeleted("ref"),e!==void 0?xr(n._root,e):n._root}function uC(n,e){n=Ne(n),n._checkNotDeleted("refFromURL");const r=Lc(e,n._repo.repoInfo_.nodeAdmin);T_("refFromURL",r);const s=r.repoInfo;return!n._repo.repoInfo_.isCustomHost()&&s.host!==n._repo.repoInfo_.host&&ln("refFromURL: Host name does not match the current database: (found "+s.host+" but expected "+n._repo.repoInfo_.host+")"),F_(n,r.path.toString())}function xr(n,e){return n=Ne(n),X(n._path)===null?jk("child","path",e,!1):bl("child","path",e,!1),new Ft(n._repo,Se(n._path,e))}function cC(n){return n=Ne(n),new b_(n._repo,n._path)}function dC(n,e){n=Ne(n),Qt("push",n._path),an("push",e,n._path,!0);const r=R_(n._repo),s=aC(r),l=xr(n,s),u=xr(n,s);let d;return e!=null?d=Td(u,e).then(()=>u):d=Promise.resolve(u),l.then=d.then.bind(d),l.catch=d.then.bind(d,void 0),l}function hC(n){return Qt("remove",n._path),Td(n,null)}function Td(n,e){n=Ne(n),Qt("set",n._path),an("set",e,n._path,!1);const r=new St;return kd(n._repo,n._path,e,null,r.wrapCallback(()=>{})),r.promise}function fC(n,e){n=Ne(n),Qt("setPriority",n._path),vd("setPriority",e);const r=new St;return kd(n._repo,Se(n._path,".priority"),e,null,r.wrapCallback(()=>{})),r.promise}function pC(n,e,r){if(Qt("setWithPriority",n._path),an("setWithPriority",e,n._path,!1),vd("setWithPriority",r),n.key===".length"||n.key===".keys")throw"setWithPriority failed: "+n.key+" is a read-only object.";const s=new St;return kd(n._repo,n._path,e,r,s.wrapCallback(()=>{})),s.promise}function mC(n,e){S_("update",e,n._path);const r=new St;return Gk(n._repo,n._path,e,r.wrapCallback(()=>{})),r.promise}function gC(n){n=Ne(n);const e=new Sd(()=>{}),r=new Us(e);return Qk(n._repo,n,r).then(s=>new tr(s,new Ft(n._repo,n._path),n._queryParams.getIndex()))}class Us{constructor(e){this.callbackContext=e}respondsTo(e){return e==="value"}createEvent(e,r){const s=r._queryParams.getIndex();return new O_("value",this,new tr(e.snapshotNode,new Ft(r._repo,r._path),s))}getEventRunner(e){return e.getEventType()==="cancel"?()=>this.callbackContext.onCancel(e.error):()=>this.callbackContext.onValue(e.snapshot,null)}createCancelEvent(e,r){return this.callbackContext.hasCancelCallback?new L_(this,e,r):null}matches(e){return e instanceof Us?!e.callbackContext||!this.callbackContext?!0:e.callbackContext.matches(this.callbackContext):!1}hasAnyCallback(){return this.callbackContext!==null}}class Vl{constructor(e,r){this.eventType=e,this.callbackContext=r}respondsTo(e){let r=e==="children_added"?"child_added":e;return r=r==="children_removed"?"child_removed":r,this.eventType===r}createCancelEvent(e,r){return this.callbackContext.hasCancelCallback?new L_(this,e,r):null}createEvent(e,r){D(e.childName!=null,"Child events should have a childName.");const s=xr(new Ft(r._repo,r._path),e.childName),l=r._queryParams.getIndex();return new O_(e.type,this,new tr(e.snapshotNode,s,l),e.prevName)}getEventRunner(e){return e.getEventType()==="cancel"?()=>this.callbackContext.onCancel(e.error):()=>this.callbackContext.onValue(e.snapshot,e.prevName)}matches(e){return e instanceof Vl?this.eventType===e.eventType&&(!this.callbackContext||!e.callbackContext||this.callbackContext.matches(e.callbackContext)):!1}hasAnyCallback(){return!!this.callbackContext}}function Bs(n,e,r,s,l){let u;if(typeof s=="object"&&(u=void 0,l=s),typeof s=="function"&&(u=s),l&&l.onlyOnce){const m=r,g=(y,w)=>{Oc(n._repo,n,f),m(y,w)};g.userCallback=r.userCallback,g.context=r.context,r=g}const d=new Sd(r,u||void 0),f=e==="value"?new Us(d):new Vl(e,d);return eC(n._repo,n,f),()=>Oc(n._repo,n,f)}function U_(n,e,r,s){return Bs(n,"value",e,r,s)}function _C(n,e,r,s){return Bs(n,"child_added",e,r,s)}function yC(n,e,r,s){return Bs(n,"child_changed",e,r,s)}function vC(n,e,r,s){return Bs(n,"child_moved",e,r,s)}function wC(n,e,r,s){return Bs(n,"child_removed",e,r,s)}function kC(n,e,r){let s=null;const l=r?new Sd(r):null;e==="value"?s=new Us(l):e&&(s=new Vl(e,l)),Oc(n._repo,n,s)}class Ut{}class B_ extends Ut{constructor(e,r){super(),this._value=e,this._key=r,this.type="endAt"}_apply(e){an("endAt",this._value,e._path,!0);const r=Sc(e._queryParams,this._value,this._key);if(Hl(r),nr(r),e._queryParams.hasEnd())throw new Error("endAt: Starting point was already set (by another call to endAt, endBefore or equalTo).");return new _t(e._repo,e._path,r,e._orderByCalled)}}function CC(n,e){return bs("endAt","key",e),new B_(n,e)}class EC extends Ut{constructor(e,r){super(),this._value=e,this._key=r,this.type="endBefore"}_apply(e){an("endBefore",this._value,e._path,!1);const r=T2(e._queryParams,this._value,this._key);if(Hl(r),nr(r),e._queryParams.hasEnd())throw new Error("endBefore: Starting point was already set (by another call to endAt, endBefore or equalTo).");return new _t(e._repo,e._path,r,e._orderByCalled)}}function SC(n,e){return bs("endBefore","key",e),new EC(n,e)}class z_ extends Ut{constructor(e,r){super(),this._value=e,this._key=r,this.type="startAt"}_apply(e){an("startAt",this._value,e._path,!0);const r=Ec(e._queryParams,this._value,this._key);if(Hl(r),nr(r),e._queryParams.hasStart())throw new Error("startAt: Starting point was already set (by another call to startAt, startBefore or equalTo).");return new _t(e._repo,e._path,r,e._orderByCalled)}}function TC(n=null,e){return bs("startAt","key",e),new z_(n,e)}class IC extends Ut{constructor(e,r){super(),this._value=e,this._key=r,this.type="startAfter"}_apply(e){an("startAfter",this._value,e._path,!1);const r=S2(e._queryParams,this._value,this._key);if(Hl(r),nr(r),e._queryParams.hasStart())throw new Error("startAfter: Starting point was already set (by another call to startAt, startAfter, or equalTo).");return new _t(e._repo,e._path,r,e._orderByCalled)}}function xC(n,e){return bs("startAfter","key",e),new IC(n,e)}class NC extends Ut{constructor(e){super(),this._limit=e,this.type="limitToFirst"}_apply(e){if(e._queryParams.hasLimit())throw new Error("limitToFirst: Limit was already set (by another call to limitToFirst or limitToLast).");return new _t(e._repo,e._path,C2(e._queryParams,this._limit),e._orderByCalled)}}function RC(n){if(typeof n!="number"||Math.floor(n)!==n||n<=0)throw new Error("limitToFirst: First argument must be a positive integer.");return new NC(n)}class PC extends Ut{constructor(e){super(),this._limit=e,this.type="limitToLast"}_apply(e){if(e._queryParams.hasLimit())throw new Error("limitToLast: Limit was already set (by another call to limitToFirst or limitToLast).");return new _t(e._repo,e._path,E2(e._queryParams,this._limit),e._orderByCalled)}}function AC(n){if(typeof n!="number"||Math.floor(n)!==n||n<=0)throw new Error("limitToLast: First argument must be a positive integer.");return new PC(n)}class MC extends Ut{constructor(e){super(),this._path=e,this.type="orderByChild"}_apply(e){jl(e,"orderByChild");const r=new ue(this._path);if(Z(r))throw new Error("orderByChild: cannot pass in empty path. Use orderByValue() instead.");const s=new Jc(r),l=xl(e._queryParams,s);return nr(l),new _t(e._repo,e._path,l,!0)}}function DC(n){if(n==="$key")throw new Error('orderByChild: "$key" is invalid.  Use orderByKey() instead.');if(n==="$priority")throw new Error('orderByChild: "$priority" is invalid.  Use orderByPriority() instead.');if(n==="$value")throw new Error('orderByChild: "$value" is invalid.  Use orderByValue() instead.');return bl("orderByChild","path",n,!1),new MC(n)}class OC extends Ut{constructor(){super(...arguments),this.type="orderByKey"}_apply(e){jl(e,"orderByKey");const r=xl(e._queryParams,on);return nr(r),new _t(e._repo,e._path,r,!0)}}function LC(){return new OC}class bC extends Ut{constructor(){super(...arguments),this.type="orderByPriority"}_apply(e){jl(e,"orderByPriority");const r=xl(e._queryParams,ve);return nr(r),new _t(e._repo,e._path,r,!0)}}function FC(){return new bC}class UC extends Ut{constructor(){super(...arguments),this.type="orderByValue"}_apply(e){jl(e,"orderByValue");const r=xl(e._queryParams,ed);return nr(r),new _t(e._repo,e._path,r,!0)}}function BC(){return new UC}class zC extends Ut{constructor(e,r){super(),this._value=e,this._key=r,this.type="equalTo"}_apply(e){if(an("equalTo",this._value,e._path,!1),e._queryParams.hasStart())throw new Error("equalTo: Starting point was already set (by another call to startAt/startAfter or equalTo).");if(e._queryParams.hasEnd())throw new Error("equalTo: Ending point was already set (by another call to endAt/endBefore or equalTo).");return new B_(this._value,this._key)._apply(new z_(this._value,this._key)._apply(e))}}function jC(n,e){return bs("equalTo","key",e),new zC(n,e)}function HC(n,...e){let r=Ne(n);for(const s of e)r=s._apply(r);return r}fk(Ft);yk(Ft);/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const VC="FIREBASE_DATABASE_EMULATOR_HOST",bc={};let j_=!1;function WC(n,e,r,s){const l=e.lastIndexOf(":"),u=e.substring(0,l),d=Ns(u);n.repoInfo_=new Bg(e,d,n.repoInfo_.namespace,n.repoInfo_.webSocketOnly,n.repoInfo_.nodeAdmin,n.repoInfo_.persistenceKey,n.repoInfo_.includeNamespaceInQueryParams,!0,r),s&&(n.authTokenProvider_=s)}function Id(n,e,r,s,l){let u=s||n.options.databaseURL;u===void 0&&(n.options.projectId||ln("Can't determine Firebase Database URL. Be sure to include  a Project ID when calling firebase.initializeApp()."),$e("Using default host for project ",n.options.projectId),u=`${n.options.projectId}-default-rtdb.firebaseio.com`);let d=Lc(u,l),f=d.repoInfo,m,g;typeof process<"u"&&im&&(g=im[VC]),g?(m=!0,u=`http://${g}?ns=${f.namespace}`,d=Lc(u,l),f=d.repoInfo):m=!d.repoInfo.secure;const y=l&&m?new ci(ci.OWNER):new xw(n.name,n.options,e);T_("Invalid Firebase Database URL",d),Z(d.path)||ln("Database URL must point to the root of a Firebase Database (not including a child path).");const w=qC(f,n,y,new Iw(n,r));return new H_(w,n)}function $C(n,e){const r=bc[e];(!r||r[n.key]!==n)&&ln(`Database ${e}(${n.repoInfo_}) has already been deleted.`),P_(n),delete r[n.key]}function qC(n,e,r,s){let l=bc[e.name];l||(l={},bc[e.name]=l);let u=l[n.toURLString()];return u&&ln("Database initialized multiple times. Please make sure the format of the database URL matches with each database() call."),u=new $k(n,j_,r,s),l[n.toURLString()]=u,u}function KC(n){j_=n}let H_=class{constructor(e,r){this._repoInternal=e,this.app=r,this.type="database",this._instanceStarted=!1}get _repo(){return this._instanceStarted||(qk(this._repoInternal,this.app.options.appId,this.app.options.databaseAuthVariableOverride),this._instanceStarted=!0),this._repoInternal}get _root(){return this._rootInternal||(this._rootInternal=new Ft(this._repo,le())),this._rootInternal}_delete(){return this._rootInternal!==null&&($C(this._repo,this.app.name),this._repoInternal=null,this._rootInternal=null),Promise.resolve()}_checkNotDeleted(e){this._rootInternal===null&&ln("Cannot call "+e+" on a deleted database.")}};function V_(){di.IS_TRANSPORT_INITIALIZED&&nt("Transport has already been initialized. Please call this function before calling ref or setting up a listener")}function QC(){V_(),$n.forceDisallow()}function GC(){V_(),Mt.forceDisallow(),$n.forceAllow()}function YC(n=Vc(),e){const r=Rs(n,"database").getImmediate({identifier:e});if(!r._instanceStarted){const s=og("database");s&&W_(r,...s)}return r}function W_(n,e,r,s={}){n=Ne(n),n._checkNotDeleted("useEmulator");const l=`${e}:${r}`,u=n._repoInternal;if(n._instanceStarted){if(l===n._repoInternal.repoInfo_.host&&sl(s,u.repoInfo_.emulatorOptions))return;ln("connectDatabaseEmulator() cannot initialize or alter the emulator configuration after the database instance has started.")}let d;if(u.repoInfo_.nodeAdmin)s.mockUserToken&&ln('mockUserToken is not supported by the Admin SDK. For client access with mock users, please use the "firebase" package instead of "firebase-admin".'),d=new ci(ci.OWNER);else if(s.mockUserToken){const f=typeof s.mockUserToken=="string"?s.mockUserToken:ug(s.mockUserToken,n.app.options.projectId);d=new ci(f)}Ns(e)&&(ag(e),cg("Database",!0)),WC(u,l,s,d)}function XC(n){n=Ne(n),n._checkNotDeleted("goOffline"),P_(n._repo)}function ZC(n){n=Ne(n),n._checkNotDeleted("goOnline"),tC(n._repo)}function JC(n,e){xg(n,e)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function eE(n){Wc(wg),Cn(new bt("database",(e,{instanceIdentifier:r})=>{const s=e.getProvider("app").getImmediate(),l=e.getProvider("auth-internal"),u=e.getProvider("app-check-internal");return Id(s,l,u,r)},"PUBLIC").setMultipleInstances(!0)),Ot(sm,om,n),Ot(sm,om,"esm2017")}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const tE={".sv":"timestamp"};function nE(){return tE}function rE(n){return{".sv":{increment:n}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $_{constructor(e,r){this.committed=e,this.snapshot=r}toJSON(){return{committed:this.committed,snapshot:this.snapshot.toJSON()}}}function iE(n,e,r){var s;if(n=Ne(n),Qt("Reference.transaction",n._path),n.key===".length"||n.key===".keys")throw"Reference.transaction failed: "+n.key+" is a read-only object.";const l=(s=r==null?void 0:r.applyLocally)!==null&&s!==void 0?s:!0,u=new St,d=(m,g,y)=>{let w=null;m?u.reject(m):(w=new tr(y,new Ft(n._repo,n._path),ve),u.resolve(new $_(g,w)))},f=U_(n,()=>{});return nC(n._repo,n._path,e,d,f,l),u.promise}Lt.prototype.simpleListen=function(n,e){this.sendRequest("q",{p:n},e)};Lt.prototype.echo=function(n,e){this.sendRequest("echo",{d:n},e)};const sE=function(n){const e=Lt.prototype.put;return Lt.prototype.put=function(r,s,l,u){u!==void 0&&(u=n()),e.call(this,r,s,l,u)},function(){Lt.prototype.put=e}},oE=function(n){KC(n)};/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function lE({app:n,url:e,version:r,customAuthImpl:s,customAppCheckImpl:l,nodeAdmin:u=!1}){Wc(r);const d=new mg("database-standalone"),f=new fc("auth-internal",d);let m;return l&&(m=new fc("app-check-internal",d),m.setComponent(new bt("app-check-internal",()=>l,"PRIVATE"))),f.setComponent(new bt("auth-internal",()=>s,"PRIVATE")),Id(n,f,m,e,u)}eE();const rI=Object.freeze(Object.defineProperty({__proto__:null,DataSnapshot:tr,Database:H_,OnDisconnect:b_,QueryConstraint:Ut,TransactionResult:$_,_QueryImpl:_t,_QueryParams:Il,_ReferenceImpl:Ft,_TEST_ACCESS_forceRestClient:oE,_TEST_ACCESS_hijackHash:sE,_initStandalone:lE,_repoManagerDatabaseFromApp:Id,_setSDKVersion:Wc,_validatePathString:bl,_validateWritablePath:Qt,child:xr,connectDatabaseEmulator:W_,enableLogging:JC,endAt:CC,endBefore:SC,equalTo:jC,forceLongPolling:GC,forceWebSockets:QC,get:gC,getDatabase:YC,goOffline:XC,goOnline:ZC,increment:rE,limitToFirst:RC,limitToLast:AC,off:kC,onChildAdded:_C,onChildChanged:yC,onChildMoved:vC,onChildRemoved:wC,onDisconnect:cC,onValue:U_,orderByChild:DC,orderByKey:LC,orderByPriority:FC,orderByValue:BC,push:dC,query:HC,ref:F_,refFromURL:uC,remove:hC,runTransaction:iE,serverTimestamp:nE,set:Td,setPriority:fC,setWithPriority:pC,startAfter:xC,startAt:TC,update:mC},Symbol.toStringTag,{value:"Module"}));/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const q_="firebasestorage.googleapis.com",K_="storageBucket",aE=120*1e3,uE=600*1e3;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Me extends Mr{constructor(e,r,s=0){super(ic(e),`Firebase Storage: ${r} (${ic(e)})`),this.status_=s,this.customData={serverResponse:null},this._baseMessage=this.message,Object.setPrototypeOf(this,Me.prototype)}get status(){return this.status_}set status(e){this.status_=e}_codeEquals(e){return ic(e)===this.code}get serverResponse(){return this.customData.serverResponse}set serverResponse(e){this.customData.serverResponse=e,this.customData.serverResponse?this.message=`${this._baseMessage}
${this.customData.serverResponse}`:this.message=this._baseMessage}}var Ae;(function(n){n.UNKNOWN="unknown",n.OBJECT_NOT_FOUND="object-not-found",n.BUCKET_NOT_FOUND="bucket-not-found",n.PROJECT_NOT_FOUND="project-not-found",n.QUOTA_EXCEEDED="quota-exceeded",n.UNAUTHENTICATED="unauthenticated",n.UNAUTHORIZED="unauthorized",n.UNAUTHORIZED_APP="unauthorized-app",n.RETRY_LIMIT_EXCEEDED="retry-limit-exceeded",n.INVALID_CHECKSUM="invalid-checksum",n.CANCELED="canceled",n.INVALID_EVENT_NAME="invalid-event-name",n.INVALID_URL="invalid-url",n.INVALID_DEFAULT_BUCKET="invalid-default-bucket",n.NO_DEFAULT_BUCKET="no-default-bucket",n.CANNOT_SLICE_BLOB="cannot-slice-blob",n.SERVER_FILE_WRONG_SIZE="server-file-wrong-size",n.NO_DOWNLOAD_URL="no-download-url",n.INVALID_ARGUMENT="invalid-argument",n.INVALID_ARGUMENT_COUNT="invalid-argument-count",n.APP_DELETED="app-deleted",n.INVALID_ROOT_OPERATION="invalid-root-operation",n.INVALID_FORMAT="invalid-format",n.INTERNAL_ERROR="internal-error",n.UNSUPPORTED_ENVIRONMENT="unsupported-environment"})(Ae||(Ae={}));function ic(n){return"storage/"+n}function xd(){const n="An unknown error occurred, please check the error payload for server response.";return new Me(Ae.UNKNOWN,n)}function cE(n){return new Me(Ae.OBJECT_NOT_FOUND,"Object '"+n+"' does not exist.")}function dE(n){return new Me(Ae.QUOTA_EXCEEDED,"Quota for bucket '"+n+"' exceeded, please view quota on https://firebase.google.com/pricing/.")}function hE(){const n="User is not authenticated, please authenticate using Firebase Authentication and try again.";return new Me(Ae.UNAUTHENTICATED,n)}function fE(){return new Me(Ae.UNAUTHORIZED_APP,"This app does not have permission to access Firebase Storage on this project.")}function pE(n){return new Me(Ae.UNAUTHORIZED,"User does not have permission to access '"+n+"'.")}function mE(){return new Me(Ae.RETRY_LIMIT_EXCEEDED,"Max retry time for operation exceeded, please try again.")}function gE(){return new Me(Ae.CANCELED,"User canceled the upload/download.")}function _E(n){return new Me(Ae.INVALID_URL,"Invalid URL '"+n+"'.")}function yE(n){return new Me(Ae.INVALID_DEFAULT_BUCKET,"Invalid default bucket '"+n+"'.")}function vE(){return new Me(Ae.NO_DEFAULT_BUCKET,"No default bucket found. Did you set the '"+K_+"' property when initializing the app?")}function wE(){return new Me(Ae.CANNOT_SLICE_BLOB,"Cannot slice blob for upload. Please retry the upload.")}function kE(){return new Me(Ae.NO_DOWNLOAD_URL,"The given file does not have any download URLs.")}function CE(n){return new Me(Ae.UNSUPPORTED_ENVIRONMENT,`${n} is missing. Make sure to install the required polyfills. See https://firebase.google.com/docs/web/environments-js-sdk#polyfills for more information.`)}function Fc(n){return new Me(Ae.INVALID_ARGUMENT,n)}function Q_(){return new Me(Ae.APP_DELETED,"The Firebase app was deleted.")}function EE(n){return new Me(Ae.INVALID_ROOT_OPERATION,"The operation '"+n+"' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').")}function _s(n,e){return new Me(Ae.INVALID_FORMAT,"String does not match format '"+n+"': "+e)}function ds(n){throw new Me(Ae.INTERNAL_ERROR,"Internal error: "+n)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class at{constructor(e,r){this.bucket=e,this.path_=r}get path(){return this.path_}get isRoot(){return this.path.length===0}fullServerUrl(){const e=encodeURIComponent;return"/b/"+e(this.bucket)+"/o/"+e(this.path)}bucketOnlyServerUrl(){return"/b/"+encodeURIComponent(this.bucket)+"/o"}static makeFromBucketSpec(e,r){let s;try{s=at.makeFromUrl(e,r)}catch{return new at(e,"")}if(s.path==="")return s;throw yE(e)}static makeFromUrl(e,r){let s=null;const l="([A-Za-z0-9.\\-_]+)";function u(ne){ne.path.charAt(ne.path.length-1)==="/"&&(ne.path_=ne.path_.slice(0,-1))}const d="(/(.*))?$",f=new RegExp("^gs://"+l+d,"i"),m={bucket:1,path:3};function g(ne){ne.path_=decodeURIComponent(ne.path)}const y="v[A-Za-z0-9_]+",w=r.replace(/[.]/g,"\\."),k="(/([^?#]*).*)?$",P=new RegExp(`^https?://${w}/${y}/b/${l}/o${k}`,"i"),L={bucket:1,path:3},U=r===q_?"(?:storage.googleapis.com|storage.cloud.google.com)":r,H="([^?#]*)",pe=new RegExp(`^https?://${U}/${l}/${H}`,"i"),ae=[{regex:f,indices:m,postModify:u},{regex:P,indices:L,postModify:g},{regex:pe,indices:{bucket:1,path:2},postModify:g}];for(let ne=0;ne<ae.length;ne++){const Ge=ae[ne],be=Ge.regex.exec(e);if(be){const Ye=be[Ge.indices.bucket];let Xe=be[Ge.indices.path];Xe||(Xe=""),s=new at(Ye,Xe),Ge.postModify(s);break}}if(s==null)throw _E(e);return s}}class SE{constructor(e){this.promise_=Promise.reject(e)}getPromise(){return this.promise_}cancel(e=!1){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function TE(n,e,r){let s=1,l=null,u=null,d=!1,f=0;function m(){return f===2}let g=!1;function y(...H){g||(g=!0,e.apply(null,H))}function w(H){l=setTimeout(()=>{l=null,n(P,m())},H)}function k(){u&&clearTimeout(u)}function P(H,...pe){if(g){k();return}if(H){k(),y.call(null,H,...pe);return}if(m()||d){k(),y.call(null,H,...pe);return}s<64&&(s*=2);let ae;f===1?(f=2,ae=0):ae=(s+Math.random())*1e3,w(ae)}let L=!1;function U(H){L||(L=!0,k(),!g&&(l!==null?(H||(f=2),clearTimeout(l),w(0)):H||(f=1)))}return w(0),u=setTimeout(()=>{d=!0,U(!0)},r),U}function IE(n){n(!1)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function xE(n){return n!==void 0}function NE(n){return typeof n=="object"&&!Array.isArray(n)}function Nd(n){return typeof n=="string"||n instanceof String}function Um(n){return Rd()&&n instanceof Blob}function Rd(){return typeof Blob<"u"}function Uc(n,e,r,s){if(s<e)throw Fc(`Invalid value for '${n}'. Expected ${e} or greater.`);if(s>r)throw Fc(`Invalid value for '${n}'. Expected ${r} or less.`)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function zs(n,e,r){let s=e;return r==null&&(s=`https://${e}`),`${r}://${s}/v0${n}`}function G_(n){const e=encodeURIComponent;let r="?";for(const s in n)if(n.hasOwnProperty(s)){const l=e(s)+"="+e(n[s]);r=r+l+"&"}return r=r.slice(0,-1),r}var Cr;(function(n){n[n.NO_ERROR=0]="NO_ERROR",n[n.NETWORK_ERROR=1]="NETWORK_ERROR",n[n.ABORT=2]="ABORT"})(Cr||(Cr={}));/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function RE(n,e){const r=n>=500&&n<600,l=[408,429].indexOf(n)!==-1,u=e.indexOf(n)!==-1;return r||l||u}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class PE{constructor(e,r,s,l,u,d,f,m,g,y,w,k=!0,P=!1){this.url_=e,this.method_=r,this.headers_=s,this.body_=l,this.successCodes_=u,this.additionalRetryCodes_=d,this.callback_=f,this.errorCallback_=m,this.timeout_=g,this.progressCallback_=y,this.connectionFactory_=w,this.retry=k,this.isUsingEmulator=P,this.pendingConnection_=null,this.backoffId_=null,this.canceled_=!1,this.appDelete_=!1,this.promise_=new Promise((L,U)=>{this.resolve_=L,this.reject_=U,this.start_()})}start_(){const e=(s,l)=>{if(l){s(!1,new tl(!1,null,!0));return}const u=this.connectionFactory_();this.pendingConnection_=u;const d=f=>{const m=f.loaded,g=f.lengthComputable?f.total:-1;this.progressCallback_!==null&&this.progressCallback_(m,g)};this.progressCallback_!==null&&u.addUploadProgressListener(d),u.send(this.url_,this.method_,this.isUsingEmulator,this.body_,this.headers_).then(()=>{this.progressCallback_!==null&&u.removeUploadProgressListener(d),this.pendingConnection_=null;const f=u.getErrorCode()===Cr.NO_ERROR,m=u.getStatus();if(!f||RE(m,this.additionalRetryCodes_)&&this.retry){const y=u.getErrorCode()===Cr.ABORT;s(!1,new tl(!1,null,y));return}const g=this.successCodes_.indexOf(m)!==-1;s(!0,new tl(g,u))})},r=(s,l)=>{const u=this.resolve_,d=this.reject_,f=l.connection;if(l.wasSuccessCode)try{const m=this.callback_(f,f.getResponse());xE(m)?u(m):u()}catch(m){d(m)}else if(f!==null){const m=xd();m.serverResponse=f.getErrorText(),this.errorCallback_?d(this.errorCallback_(f,m)):d(m)}else if(l.canceled){const m=this.appDelete_?Q_():gE();d(m)}else{const m=mE();d(m)}};this.canceled_?r(!1,new tl(!1,null,!0)):this.backoffId_=TE(e,r,this.timeout_)}getPromise(){return this.promise_}cancel(e){this.canceled_=!0,this.appDelete_=e||!1,this.backoffId_!==null&&IE(this.backoffId_),this.pendingConnection_!==null&&this.pendingConnection_.abort()}}class tl{constructor(e,r,s){this.wasSuccessCode=e,this.connection=r,this.canceled=!!s}}function AE(n,e){e!==null&&e.length>0&&(n.Authorization="Firebase "+e)}function ME(n,e){n["X-Firebase-Storage-Version"]="webjs/"+(e??"AppManager")}function DE(n,e){e&&(n["X-Firebase-GMPID"]=e)}function OE(n,e){e!==null&&(n["X-Firebase-AppCheck"]=e)}function LE(n,e,r,s,l,u,d=!0,f=!1){const m=G_(n.urlParams),g=n.url+m,y=Object.assign({},n.headers);return DE(y,e),AE(y,r),ME(y,u),OE(y,s),new PE(g,n.method,y,n.body,n.successCodes,n.additionalRetryCodes,n.handler,n.errorHandler,n.timeout,n.progressCallback,l,d,f)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function bE(){return typeof BlobBuilder<"u"?BlobBuilder:typeof WebKitBlobBuilder<"u"?WebKitBlobBuilder:void 0}function FE(...n){const e=bE();if(e!==void 0){const r=new e;for(let s=0;s<n.length;s++)r.append(n[s]);return r.getBlob()}else{if(Rd())return new Blob(n);throw new Me(Ae.UNSUPPORTED_ENVIRONMENT,"This browser doesn't seem to support creating Blobs")}}function UE(n,e,r){return n.webkitSlice?n.webkitSlice(e,r):n.mozSlice?n.mozSlice(e,r):n.slice?n.slice(e,r):null}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function BE(n){if(typeof atob>"u")throw CE("base-64");return atob(n)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const sn={RAW:"raw",BASE64:"base64",BASE64URL:"base64url",DATA_URL:"data_url"};class sc{constructor(e,r){this.data=e,this.contentType=r||null}}function zE(n,e){switch(n){case sn.RAW:return new sc(Y_(e));case sn.BASE64:case sn.BASE64URL:return new sc(X_(n,e));case sn.DATA_URL:return new sc(HE(e),VE(e))}throw xd()}function Y_(n){const e=[];for(let r=0;r<n.length;r++){let s=n.charCodeAt(r);if(s<=127)e.push(s);else if(s<=2047)e.push(192|s>>6,128|s&63);else if((s&64512)===55296)if(!(r<n.length-1&&(n.charCodeAt(r+1)&64512)===56320))e.push(239,191,189);else{const u=s,d=n.charCodeAt(++r);s=65536|(u&1023)<<10|d&1023,e.push(240|s>>18,128|s>>12&63,128|s>>6&63,128|s&63)}else(s&64512)===56320?e.push(239,191,189):e.push(224|s>>12,128|s>>6&63,128|s&63)}return new Uint8Array(e)}function jE(n){let e;try{e=decodeURIComponent(n)}catch{throw _s(sn.DATA_URL,"Malformed data URL.")}return Y_(e)}function X_(n,e){switch(n){case sn.BASE64:{const l=e.indexOf("-")!==-1,u=e.indexOf("_")!==-1;if(l||u)throw _s(n,"Invalid character '"+(l?"-":"_")+"' found: is it base64url encoded?");break}case sn.BASE64URL:{const l=e.indexOf("+")!==-1,u=e.indexOf("/")!==-1;if(l||u)throw _s(n,"Invalid character '"+(l?"+":"/")+"' found: is it base64 encoded?");e=e.replace(/-/g,"+").replace(/_/g,"/");break}}let r;try{r=BE(e)}catch(l){throw l.message.includes("polyfill")?l:_s(n,"Invalid character found")}const s=new Uint8Array(r.length);for(let l=0;l<r.length;l++)s[l]=r.charCodeAt(l);return s}class Z_{constructor(e){this.base64=!1,this.contentType=null;const r=e.match(/^data:([^,]+)?,/);if(r===null)throw _s(sn.DATA_URL,"Must be formatted 'data:[<mediatype>][;base64],<data>");const s=r[1]||null;s!=null&&(this.base64=WE(s,";base64"),this.contentType=this.base64?s.substring(0,s.length-7):s),this.rest=e.substring(e.indexOf(",")+1)}}function HE(n){const e=new Z_(n);return e.base64?X_(sn.BASE64,e.rest):jE(e.rest)}function VE(n){return new Z_(n).contentType}function WE(n,e){return n.length>=e.length?n.substring(n.length-e.length)===e:!1}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wn{constructor(e,r){let s=0,l="";Um(e)?(this.data_=e,s=e.size,l=e.type):e instanceof ArrayBuffer?(r?this.data_=new Uint8Array(e):(this.data_=new Uint8Array(e.byteLength),this.data_.set(new Uint8Array(e))),s=this.data_.length):e instanceof Uint8Array&&(r?this.data_=e:(this.data_=new Uint8Array(e.length),this.data_.set(e)),s=e.length),this.size_=s,this.type_=l}size(){return this.size_}type(){return this.type_}slice(e,r){if(Um(this.data_)){const s=this.data_,l=UE(s,e,r);return l===null?null:new Wn(l)}else{const s=new Uint8Array(this.data_.buffer,e,r-e);return new Wn(s,!0)}}static getBlob(...e){if(Rd()){const r=e.map(s=>s instanceof Wn?s.data_:s);return new Wn(FE.apply(null,r))}else{const r=e.map(d=>Nd(d)?zE(sn.RAW,d).data:d.data_);let s=0;r.forEach(d=>{s+=d.byteLength});const l=new Uint8Array(s);let u=0;return r.forEach(d=>{for(let f=0;f<d.length;f++)l[u++]=d[f]}),new Wn(l,!0)}}uploadData(){return this.data_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Pd(n){let e;try{e=JSON.parse(n)}catch{return null}return NE(e)?e:null}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function $E(n){if(n.length===0)return null;const e=n.lastIndexOf("/");return e===-1?"":n.slice(0,e)}function qE(n,e){const r=e.split("/").filter(s=>s.length>0).join("/");return n.length===0?r:n+"/"+r}function J_(n){const e=n.lastIndexOf("/",n.length-2);return e===-1?n:n.slice(e+1)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function KE(n,e){return e}class ot{constructor(e,r,s,l){this.server=e,this.local=r||e,this.writable=!!s,this.xform=l||KE}}let nl=null;function QE(n){return!Nd(n)||n.length<2?n:J_(n)}function ey(){if(nl)return nl;const n=[];n.push(new ot("bucket")),n.push(new ot("generation")),n.push(new ot("metageneration")),n.push(new ot("name","fullPath",!0));function e(u,d){return QE(d)}const r=new ot("name");r.xform=e,n.push(r);function s(u,d){return d!==void 0?Number(d):d}const l=new ot("size");return l.xform=s,n.push(l),n.push(new ot("timeCreated")),n.push(new ot("updated")),n.push(new ot("md5Hash",null,!0)),n.push(new ot("cacheControl",null,!0)),n.push(new ot("contentDisposition",null,!0)),n.push(new ot("contentEncoding",null,!0)),n.push(new ot("contentLanguage",null,!0)),n.push(new ot("contentType",null,!0)),n.push(new ot("metadata","customMetadata",!0)),nl=n,nl}function GE(n,e){function r(){const s=n.bucket,l=n.fullPath,u=new at(s,l);return e._makeStorageReference(u)}Object.defineProperty(n,"ref",{get:r})}function YE(n,e,r){const s={};s.type="file";const l=r.length;for(let u=0;u<l;u++){const d=r[u];s[d.local]=d.xform(s,e[d.server])}return GE(s,n),s}function ty(n,e,r){const s=Pd(e);return s===null?null:YE(n,s,r)}function XE(n,e,r,s){const l=Pd(e);if(l===null||!Nd(l.downloadTokens))return null;const u=l.downloadTokens;if(u.length===0)return null;const d=encodeURIComponent;return u.split(",").map(g=>{const y=n.bucket,w=n.fullPath,k="/b/"+d(y)+"/o/"+d(w),P=zs(k,r,s),L=G_({alt:"media",token:g});return P+L})[0]}function ZE(n,e){const r={},s=e.length;for(let l=0;l<s;l++){const u=e[l];u.writable&&(r[u.server]=n[u.local])}return JSON.stringify(r)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Bm="prefixes",zm="items";function JE(n,e,r){const s={prefixes:[],items:[],nextPageToken:r.nextPageToken};if(r[Bm])for(const l of r[Bm]){const u=l.replace(/\/$/,""),d=n._makeStorageReference(new at(e,u));s.prefixes.push(d)}if(r[zm])for(const l of r[zm]){const u=n._makeStorageReference(new at(e,l.name));s.items.push(u)}return s}function eS(n,e,r){const s=Pd(r);return s===null?null:JE(n,e,s)}class Wl{constructor(e,r,s,l){this.url=e,this.method=r,this.handler=s,this.timeout=l,this.urlParams={},this.headers={},this.body=null,this.errorHandler=null,this.progressCallback=null,this.successCodes=[200],this.additionalRetryCodes=[]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ad(n){if(!n)throw xd()}function tS(n,e){function r(s,l){const u=ty(n,l,e);return Ad(u!==null),u}return r}function nS(n,e){function r(s,l){const u=eS(n,e,l);return Ad(u!==null),u}return r}function rS(n,e){function r(s,l){const u=ty(n,l,e);return Ad(u!==null),XE(u,l,n.host,n._protocol)}return r}function Md(n){function e(r,s){let l;return r.getStatus()===401?r.getErrorText().includes("Firebase App Check token is invalid")?l=fE():l=hE():r.getStatus()===402?l=dE(n.bucket):r.getStatus()===403?l=pE(n.path):l=s,l.status=r.getStatus(),l.serverResponse=s.serverResponse,l}return e}function ny(n){const e=Md(n);function r(s,l){let u=e(s,l);return s.getStatus()===404&&(u=cE(n.path)),u.serverResponse=l.serverResponse,u}return r}function iS(n,e,r,s,l){const u={};e.isRoot?u.prefix="":u.prefix=e.path+"/",r.length>0&&(u.delimiter=r),s&&(u.pageToken=s),l&&(u.maxResults=l);const d=e.bucketOnlyServerUrl(),f=zs(d,n.host,n._protocol),m="GET",g=n.maxOperationRetryTime,y=new Wl(f,m,nS(n,e.bucket),g);return y.urlParams=u,y.errorHandler=Md(e),y}function sS(n,e,r){const s=e.fullServerUrl(),l=zs(s,n.host,n._protocol),u="GET",d=n.maxOperationRetryTime,f=new Wl(l,u,rS(n,r),d);return f.errorHandler=ny(e),f}function oS(n,e){const r=e.fullServerUrl(),s=zs(r,n.host,n._protocol),l="DELETE",u=n.maxOperationRetryTime;function d(m,g){}const f=new Wl(s,l,d,u);return f.successCodes=[200,204],f.errorHandler=ny(e),f}function lS(n,e){return n&&n.contentType||e&&e.type()||"application/octet-stream"}function aS(n,e,r){const s=Object.assign({},r);return s.fullPath=n.path,s.size=e.size(),s.contentType||(s.contentType=lS(null,e)),s}function uS(n,e,r,s,l){const u=e.bucketOnlyServerUrl(),d={"X-Goog-Upload-Protocol":"multipart"};function f(){let ae="";for(let ne=0;ne<2;ne++)ae=ae+Math.random().toString().slice(2);return ae}const m=f();d["Content-Type"]="multipart/related; boundary="+m;const g=aS(e,s,l),y=ZE(g,r),w="--"+m+`\r
Content-Type: application/json; charset=utf-8\r
\r
`+y+`\r
--`+m+`\r
Content-Type: `+g.contentType+`\r
\r
`,k=`\r
--`+m+"--",P=Wn.getBlob(w,s,k);if(P===null)throw wE();const L={name:g.fullPath},U=zs(u,n.host,n._protocol),H="POST",pe=n.maxUploadRetryTime,he=new Wl(U,H,tS(n,r),pe);return he.urlParams=L,he.headers=d,he.body=P.uploadData(),he.errorHandler=Md(e),he}class cS{constructor(){this.sent_=!1,this.xhr_=new XMLHttpRequest,this.initXhr(),this.errorCode_=Cr.NO_ERROR,this.sendPromise_=new Promise(e=>{this.xhr_.addEventListener("abort",()=>{this.errorCode_=Cr.ABORT,e()}),this.xhr_.addEventListener("error",()=>{this.errorCode_=Cr.NETWORK_ERROR,e()}),this.xhr_.addEventListener("load",()=>{e()})})}send(e,r,s,l,u){if(this.sent_)throw ds("cannot .send() more than once");if(Ns(e)&&s&&(this.xhr_.withCredentials=!0),this.sent_=!0,this.xhr_.open(r,e,!0),u!==void 0)for(const d in u)u.hasOwnProperty(d)&&this.xhr_.setRequestHeader(d,u[d].toString());return l!==void 0?this.xhr_.send(l):this.xhr_.send(),this.sendPromise_}getErrorCode(){if(!this.sent_)throw ds("cannot .getErrorCode() before sending");return this.errorCode_}getStatus(){if(!this.sent_)throw ds("cannot .getStatus() before sending");try{return this.xhr_.status}catch{return-1}}getResponse(){if(!this.sent_)throw ds("cannot .getResponse() before sending");return this.xhr_.response}getErrorText(){if(!this.sent_)throw ds("cannot .getErrorText() before sending");return this.xhr_.statusText}abort(){this.xhr_.abort()}getResponseHeader(e){return this.xhr_.getResponseHeader(e)}addUploadProgressListener(e){this.xhr_.upload!=null&&this.xhr_.upload.addEventListener("progress",e)}removeUploadProgressListener(e){this.xhr_.upload!=null&&this.xhr_.upload.removeEventListener("progress",e)}}class dS extends cS{initXhr(){this.xhr_.responseType="text"}}function $l(){return new dS}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Nr{constructor(e,r){this._service=e,r instanceof at?this._location=r:this._location=at.makeFromUrl(r,e.host)}toString(){return"gs://"+this._location.bucket+"/"+this._location.path}_newRef(e,r){return new Nr(e,r)}get root(){const e=new at(this._location.bucket,"");return this._newRef(this._service,e)}get bucket(){return this._location.bucket}get fullPath(){return this._location.path}get name(){return J_(this._location.path)}get storage(){return this._service}get parent(){const e=$E(this._location.path);if(e===null)return null;const r=new at(this._location.bucket,e);return new Nr(this._service,r)}_throwIfRoot(e){if(this._location.path==="")throw EE(e)}}function hS(n,e,r){n._throwIfRoot("uploadBytes");const s=uS(n.storage,n._location,ey(),new Wn(e,!0),r);return n.storage.makeRequestWithTokens(s,$l).then(l=>({metadata:l,ref:n}))}function fS(n){const e={prefixes:[],items:[]};return ry(n,e).then(()=>e)}async function ry(n,e,r){const l=await pS(n,{pageToken:r});e.prefixes.push(...l.prefixes),e.items.push(...l.items),l.nextPageToken!=null&&await ry(n,e,l.nextPageToken)}function pS(n,e){e!=null&&typeof e.maxResults=="number"&&Uc("options.maxResults",1,1e3,e.maxResults);const r=e||{},s=iS(n.storage,n._location,"/",r.pageToken,r.maxResults);return n.storage.makeRequestWithTokens(s,$l)}function mS(n){n._throwIfRoot("getDownloadURL");const e=sS(n.storage,n._location,ey());return n.storage.makeRequestWithTokens(e,$l).then(r=>{if(r===null)throw kE();return r})}function gS(n){n._throwIfRoot("deleteObject");const e=oS(n.storage,n._location);return n.storage.makeRequestWithTokens(e,$l)}function _S(n,e){const r=qE(n._location.path,e),s=new at(n._location.bucket,r);return new Nr(n.storage,s)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yS(n){return/^[A-Za-z]+:\/\//.test(n)}function vS(n,e){return new Nr(n,e)}function iy(n,e){if(n instanceof Dd){const r=n;if(r._bucket==null)throw vE();const s=new Nr(r,r._bucket);return e!=null?iy(s,e):s}else return e!==void 0?_S(n,e):n}function wS(n,e){if(e&&yS(e)){if(n instanceof Dd)return vS(n,e);throw Fc("To use ref(service, url), the first argument must be a Storage instance.")}else return iy(n,e)}function jm(n,e){const r=e==null?void 0:e[K_];return r==null?null:at.makeFromBucketSpec(r,n)}function kS(n,e,r,s={}){n.host=`${e}:${r}`;const l=Ns(e);l&&(ag(`https://${n.host}/b`),cg("Storage",!0)),n._isUsingEmulator=!0,n._protocol=l?"https":"http";const{mockUserToken:u}=s;u&&(n._overrideAuthToken=typeof u=="string"?u:ug(u,n.app.options.projectId))}class Dd{constructor(e,r,s,l,u,d=!1){this.app=e,this._authProvider=r,this._appCheckProvider=s,this._url=l,this._firebaseVersion=u,this._isUsingEmulator=d,this._bucket=null,this._host=q_,this._protocol="https",this._appId=null,this._deleted=!1,this._maxOperationRetryTime=aE,this._maxUploadRetryTime=uE,this._requests=new Set,l!=null?this._bucket=at.makeFromBucketSpec(l,this._host):this._bucket=jm(this._host,this.app.options)}get host(){return this._host}set host(e){this._host=e,this._url!=null?this._bucket=at.makeFromBucketSpec(this._url,e):this._bucket=jm(e,this.app.options)}get maxUploadRetryTime(){return this._maxUploadRetryTime}set maxUploadRetryTime(e){Uc("time",0,Number.POSITIVE_INFINITY,e),this._maxUploadRetryTime=e}get maxOperationRetryTime(){return this._maxOperationRetryTime}set maxOperationRetryTime(e){Uc("time",0,Number.POSITIVE_INFINITY,e),this._maxOperationRetryTime=e}async _getAuthToken(){if(this._overrideAuthToken)return this._overrideAuthToken;const e=this._authProvider.getImmediate({optional:!0});if(e){const r=await e.getToken();if(r!==null)return r.accessToken}return null}async _getAppCheckToken(){if(vg(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=this._appCheckProvider.getImmediate({optional:!0});return e?(await e.getToken()).token:null}_delete(){return this._deleted||(this._deleted=!0,this._requests.forEach(e=>e.cancel()),this._requests.clear()),Promise.resolve()}_makeStorageReference(e){return new Nr(this,e)}_makeRequest(e,r,s,l,u=!0){if(this._deleted)return new SE(Q_());{const d=LE(e,this._appId,s,l,r,this._firebaseVersion,u,this._isUsingEmulator);return this._requests.add(d),d.getPromise().then(()=>this._requests.delete(d),()=>this._requests.delete(d)),d}}async makeRequestWithTokens(e,r){const[s,l]=await Promise.all([this._getAuthToken(),this._getAppCheckToken()]);return this._makeRequest(e,r,s,l).getPromise()}}const Hm="@firebase/storage",Vm="0.13.14";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const sy="storage";function iI(n,e,r){return n=Ne(n),hS(n,e,r)}function sI(n){return n=Ne(n),fS(n)}function oI(n){return n=Ne(n),mS(n)}function lI(n){return n=Ne(n),gS(n)}function aI(n,e){return n=Ne(n),wS(n,e)}function uI(n=Vc(),e){n=Ne(n);const s=Rs(n,sy).getImmediate({identifier:e}),l=og("storage");return l&&CS(s,...l),s}function CS(n,e,r,s={}){kS(n,e,r,s)}function ES(n,{instanceIdentifier:e}){const r=n.getProvider("app").getImmediate(),s=n.getProvider("auth-internal"),l=n.getProvider("app-check-internal");return new Dd(r,s,l,e,wg)}function SS(){Cn(new bt(sy,ES,"PUBLIC").setMultipleInstances(!0)),Ot(Hm,Vm,""),Ot(Hm,Vm,"esm2017")}SS();/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const TS=n=>n.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),oy=(...n)=>n.filter((e,r,s)=>!!e&&e.trim()!==""&&s.indexOf(e)===r).join(" ").trim();/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var IS={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xS=ai.forwardRef(({color:n="currentColor",size:e=24,strokeWidth:r=2,absoluteStrokeWidth:s,className:l="",children:u,iconNode:d,...f},m)=>ai.createElement("svg",{ref:m,...IS,width:e,height:e,stroke:n,strokeWidth:s?Number(r)*24/Number(e):r,className:oy("lucide",l),...f},[...d.map(([g,y])=>ai.createElement(g,y)),...Array.isArray(u)?u:[u]]));/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=(n,e)=>{const r=ai.forwardRef(({className:s,...l},u)=>ai.createElement(xS,{ref:u,iconNode:e,className:oy(`lucide-${TS(n)}`,s),...l}));return r.displayName=`${n}`,r};/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cI=A("Activity",[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dI=A("Anchor",[["path",{d:"M12 22V8",key:"qkxhtm"}],["path",{d:"M5 12H2a10 10 0 0 0 20 0h-3",key:"1hv3nh"}],["circle",{cx:"12",cy:"5",r:"3",key:"rqqgnr"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hI=A("ArrowDown",[["path",{d:"M12 5v14",key:"s699le"}],["path",{d:"m19 12-7 7-7-7",key:"1idqje"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fI=A("ArrowUp",[["path",{d:"m5 12 7-7 7 7",key:"hav0vg"}],["path",{d:"M12 19V5",key:"x0mq9r"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pI=A("BellOff",[["path",{d:"M10.268 21a2 2 0 0 0 3.464 0",key:"vwvbt9"}],["path",{d:"M17 17H4a1 1 0 0 1-.74-1.673C4.59 13.956 6 12.499 6 8a6 6 0 0 1 .258-1.742",key:"178tsu"}],["path",{d:"m2 2 20 20",key:"1ooewy"}],["path",{d:"M8.668 3.01A6 6 0 0 1 18 8c0 2.687.77 4.653 1.707 6.05",key:"1hqiys"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mI=A("Bell",[["path",{d:"M10.268 21a2 2 0 0 0 3.464 0",key:"vwvbt9"}],["path",{d:"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",key:"11g9vi"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gI=A("BookOpen",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _I=A("Bot",[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yI=A("Box",[["path",{d:"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",key:"hh9hay"}],["path",{d:"m3.3 7 8.7 5 8.7-5",key:"g66t2b"}],["path",{d:"M12 22V12",key:"d0xqtd"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vI=A("CalendarClock",[["path",{d:"M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5",key:"1osxxc"}],["path",{d:"M16 2v4",key:"4m81vk"}],["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M3 10h5",key:"r794hk"}],["path",{d:"M17.5 17.5 16 16.3V14",key:"akvzfd"}],["circle",{cx:"16",cy:"16",r:"6",key:"qoo3c4"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wI=A("Camera",[["path",{d:"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",key:"1tc9qg"}],["circle",{cx:"12",cy:"13",r:"3",key:"1vg3eu"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kI=A("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const CI=A("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const EI=A("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const SI=A("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const TI=A("ChevronUp",[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const II=A("CircleAlert",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xI=A("CircleCheckBig",[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const NI=A("CircleCheck",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const RI=A("CircleHelp",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",key:"1u773s"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const PI=A("ClipboardPaste",[["path",{d:"M15 2H9a1 1 0 0 0-1 1v2c0 .6.4 1 1 1h6c.6 0 1-.4 1-1V3c0-.6-.4-1-1-1Z",key:"1pp7kr"}],["path",{d:"M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2M16 4h2a2 2 0 0 1 2 2v2M11 14h10",key:"2ik1ml"}],["path",{d:"m17 10 4 4-4 4",key:"vp2hj1"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const AI=A("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const MI=A("CloudOff",[["path",{d:"m2 2 20 20",key:"1ooewy"}],["path",{d:"M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193",key:"yfwify"}],["path",{d:"M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07",key:"jlfiyv"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const DI=A("Construction",[["rect",{x:"2",y:"6",width:"20",height:"8",rx:"1",key:"1estib"}],["path",{d:"M17 14v7",key:"7m2elx"}],["path",{d:"M7 14v7",key:"1cm7wv"}],["path",{d:"M17 3v3",key:"1v4jwn"}],["path",{d:"M7 3v3",key:"7o6guu"}],["path",{d:"M10 14 2.3 6.3",key:"1023jk"}],["path",{d:"m14 6 7.7 7.7",key:"1s8pl2"}],["path",{d:"m8 6 8 8",key:"hl96qh"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const OI=A("Copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const LI=A("Database",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bI=A("Dices",[["rect",{width:"12",height:"12",x:"2",y:"10",rx:"2",ry:"2",key:"6agr2n"}],["path",{d:"m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6",key:"1o487t"}],["path",{d:"M6 18h.01",key:"uhywen"}],["path",{d:"M10 14h.01",key:"ssrbsk"}],["path",{d:"M15 6h.01",key:"cblpky"}],["path",{d:"M18 9h.01",key:"2061c0"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const FI=A("DoorOpen",[["path",{d:"M13 4h3a2 2 0 0 1 2 2v14",key:"hrm0s9"}],["path",{d:"M2 20h3",key:"1gaodv"}],["path",{d:"M13 20h9",key:"s90cdi"}],["path",{d:"M10 12v.01",key:"vx6srw"}],["path",{d:"M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z",key:"199qr4"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const UI=A("Download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const BI=A("EllipsisVertical",[["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["circle",{cx:"12",cy:"5",r:"1",key:"gxeob9"}],["circle",{cx:"12",cy:"19",r:"1",key:"lyex9k"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zI=A("ExternalLink",[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jI=A("EyeOff",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const HI=A("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const VI=A("FileDown",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M12 18v-6",key:"17g6i2"}],["path",{d:"m9 15 3 3 3-3",key:"1npd3o"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const WI=A("FileSpreadsheet",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M8 13h2",key:"yr2amv"}],["path",{d:"M14 13h2",key:"un5t4a"}],["path",{d:"M8 17h2",key:"2yhykz"}],["path",{d:"M14 17h2",key:"10kma7"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $I=A("FileText",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qI=A("FileWarning",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const KI=A("FlaskConical",[["path",{d:"M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2",key:"18mbvz"}],["path",{d:"M6.453 15h11.094",key:"3shlmq"}],["path",{d:"M8.5 2h7",key:"csnxdl"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const QI=A("FolderOpen",[["path",{d:"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",key:"usdka0"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const GI=A("Hand",[["path",{d:"M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2",key:"1fvzgz"}],["path",{d:"M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2",key:"1kc0my"}],["path",{d:"M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8",key:"10h0bg"}],["path",{d:"M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",key:"1s1gnw"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const YI=A("Hash",[["line",{x1:"4",x2:"20",y1:"9",y2:"9",key:"4lhtct"}],["line",{x1:"4",x2:"20",y1:"15",y2:"15",key:"vyu0kd"}],["line",{x1:"10",x2:"8",y1:"3",y2:"21",key:"1ggp8o"}],["line",{x1:"16",x2:"14",y1:"3",y2:"21",key:"weycgp"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const XI=A("History",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}],["path",{d:"M12 7v5l4 2",key:"1fdv2h"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ZI=A("House",[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"1d0kgt"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const JI=A("Info",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const e4=A("Key",[["path",{d:"m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4",key:"g0fldk"}],["path",{d:"m21 2-9.6 9.6",key:"1j0ho8"}],["circle",{cx:"7.5",cy:"15.5",r:"5.5",key:"yqb3hr"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const t4=A("Languages",[["path",{d:"m5 8 6 6",key:"1wu5hv"}],["path",{d:"m4 14 6-6 2-3",key:"1k1g8d"}],["path",{d:"M2 5h12",key:"or177f"}],["path",{d:"M7 2h1",key:"1t2jsx"}],["path",{d:"m22 22-5-10-5 10",key:"don7ne"}],["path",{d:"M14 18h6",key:"1m8k6r"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const n4=A("Layers",[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r4=A("LayoutGrid",[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1",key:"1g98yp"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1",key:"6d4xhi"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1",key:"nxv5o0"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i4=A("Library",[["path",{d:"m16 6 4 14",key:"ji33uf"}],["path",{d:"M12 6v14",key:"1n7gus"}],["path",{d:"M8 8v12",key:"1gg7y9"}],["path",{d:"M4 4v16",key:"6qkkli"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s4=A("Link2",[["path",{d:"M9 17H7A5 5 0 0 1 7 7h2",key:"8i5ue5"}],["path",{d:"M15 7h2a5 5 0 1 1 0 10h-2",key:"1b9ql8"}],["line",{x1:"8",x2:"16",y1:"12",y2:"12",key:"1jonct"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o4=A("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l4=A("Loader",[["path",{d:"M12 2v4",key:"3427ic"}],["path",{d:"m16.2 7.8 2.9-2.9",key:"r700ao"}],["path",{d:"M18 12h4",key:"wj9ykh"}],["path",{d:"m16.2 16.2 2.9 2.9",key:"1bxg5t"}],["path",{d:"M12 18v4",key:"jadmvz"}],["path",{d:"m4.9 19.1 2.9-2.9",key:"bwix9q"}],["path",{d:"M2 12h4",key:"j09sii"}],["path",{d:"m4.9 4.9 2.9 2.9",key:"giyufr"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const a4=A("LockOpen",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 9.9-1",key:"1mm8w8"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u4=A("Lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c4=A("LogIn",[["path",{d:"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4",key:"u53s6r"}],["polyline",{points:"10 17 15 12 10 7",key:"1ail0h"}],["line",{x1:"15",x2:"3",y1:"12",y2:"12",key:"v6grx8"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d4=A("LogOut",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h4=A("MapPin",[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f4=A("MessageCircle",[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z",key:"vv11sd"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p4=A("MessageSquareReply",[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",key:"1lielz"}],["path",{d:"m10 7-3 3 3 3",key:"1eugdv"}],["path",{d:"M17 13v-1a2 2 0 0 0-2-2H7",key:"ernfh3"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m4=A("MicOff",[["line",{x1:"2",x2:"22",y1:"2",y2:"22",key:"a6p6uj"}],["path",{d:"M18.89 13.23A7.12 7.12 0 0 0 19 12v-2",key:"80xlxr"}],["path",{d:"M5 10v2a7 7 0 0 0 12 5",key:"p2k8kg"}],["path",{d:"M15 9.34V5a3 3 0 0 0-5.68-1.33",key:"1gzdoj"}],["path",{d:"M9 9v3a3 3 0 0 0 5.12 2.12",key:"r2i35w"}],["line",{x1:"12",x2:"12",y1:"19",y2:"22",key:"x3vr5v"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g4=A("Mic",[["path",{d:"M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z",key:"131961"}],["path",{d:"M19 10v2a7 7 0 0 1-14 0v-2",key:"1vc78b"}],["line",{x1:"12",x2:"12",y1:"19",y2:"22",key:"x3vr5v"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _4=A("NotebookPen",[["path",{d:"M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4",key:"re6nr2"}],["path",{d:"M2 6h4",key:"aawbzj"}],["path",{d:"M2 10h4",key:"l0bgd4"}],["path",{d:"M2 14h4",key:"1gsvsf"}],["path",{d:"M2 18h4",key:"1bu2t1"}],["path",{d:"M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z",key:"pqwjuv"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y4=A("OctagonAlert",[["path",{d:"M12 16h.01",key:"1drbdi"}],["path",{d:"M12 8v4",key:"1got3b"}],["path",{d:"M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z",key:"1fd625"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v4=A("Package",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["path",{d:"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7",key:"yx3hmr"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w4=A("Pause",[["rect",{x:"14",y:"4",width:"4",height:"16",rx:"1",key:"zuxfzm"}],["rect",{x:"6",y:"4",width:"4",height:"16",rx:"1",key:"1okwgv"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k4=A("PenLine",[["path",{d:"M12 20h9",key:"t2du7b"}],["path",{d:"M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z",key:"1ykcvy"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C4=A("Pencil",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}],["path",{d:"m15 5 4 4",key:"1mk7zo"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E4=A("Phone",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S4=A("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T4=A("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I4=A("Printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x4=A("QrCode",[["rect",{width:"5",height:"5",x:"3",y:"3",rx:"1",key:"1tu5fj"}],["rect",{width:"5",height:"5",x:"16",y:"3",rx:"1",key:"1v8r4q"}],["rect",{width:"5",height:"5",x:"3",y:"16",rx:"1",key:"1x03jg"}],["path",{d:"M21 16h-3a2 2 0 0 0-2 2v3",key:"177gqh"}],["path",{d:"M21 21v.01",key:"ents32"}],["path",{d:"M12 7v3a2 2 0 0 1-2 2H7",key:"8crl2c"}],["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M12 3h.01",key:"n36tog"}],["path",{d:"M12 16v.01",key:"133mhm"}],["path",{d:"M16 12h1",key:"1slzba"}],["path",{d:"M21 12v.01",key:"1lwtk9"}],["path",{d:"M12 21v-1",key:"1880an"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N4=A("RefreshCw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R4=A("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P4=A("Save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A4=A("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M4=A("SendHorizontal",[["path",{d:"M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z",key:"117uat"}],["path",{d:"M6 12h16",key:"s4cdu5"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const D4=A("Send",[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O4=A("ShieldCheck",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L4=A("Shield",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b4=A("Ship",[["path",{d:"M12 10.189V14",key:"1p8cqu"}],["path",{d:"M12 2v3",key:"qbqxhf"}],["path",{d:"M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6",key:"qpkstq"}],["path",{d:"M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76",key:"7tigtc"}],["path",{d:"M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",key:"1924j5"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F4=A("Snowflake",[["path",{d:"m10 20-1.25-2.5L6 18",key:"18frcb"}],["path",{d:"M10 4 8.75 6.5 6 6",key:"7mghy3"}],["path",{d:"m14 20 1.25-2.5L18 18",key:"1chtki"}],["path",{d:"m14 4 1.25 2.5L18 6",key:"1b4wsy"}],["path",{d:"m17 21-3-6h-4",key:"15hhxa"}],["path",{d:"m17 3-3 6 1.5 3",key:"11697g"}],["path",{d:"M2 12h6.5L10 9",key:"kv9z4n"}],["path",{d:"m20 10-1.5 2 1.5 2",key:"1swlpi"}],["path",{d:"M22 12h-6.5L14 15",key:"1mxi28"}],["path",{d:"m4 10 1.5 2L4 14",key:"k9enpj"}],["path",{d:"m7 21 3-6-1.5-3",key:"j8hb9u"}],["path",{d:"m7 3 3 6h4",key:"1otusx"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U4=A("Sparkles",[["path",{d:"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",key:"4pj2yx"}],["path",{d:"M20 3v4",key:"1olli1"}],["path",{d:"M22 5h-4",key:"1gvqau"}],["path",{d:"M4 17v2",key:"vumght"}],["path",{d:"M5 18H3",key:"zchphs"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B4=A("Star",[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"r04s7s"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z4=A("StickyNote",[["path",{d:"M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z",key:"qazsjp"}],["path",{d:"M15 3v4a2 2 0 0 0 2 2h4",key:"40519r"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j4=A("Sun",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H4=A("Thermometer",[["path",{d:"M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z",key:"17jzev"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V4=A("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W4=A("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $4=A("Truck",[["path",{d:"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2",key:"wrbu53"}],["path",{d:"M15 18H9",key:"1lyqi6"}],["path",{d:"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14",key:"lysw3i"}],["circle",{cx:"17",cy:"18",r:"2",key:"332jqn"}],["circle",{cx:"7",cy:"18",r:"2",key:"19iecd"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q4=A("Type",[["polyline",{points:"4 7 4 4 20 4 20 7",key:"1nosan"}],["line",{x1:"9",x2:"15",y1:"20",y2:"20",key:"swin9y"}],["line",{x1:"12",x2:"12",y1:"4",y2:"20",key:"1tx1rr"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K4=A("Undo2",[["path",{d:"M9 14 4 9l5-5",key:"102s5s"}],["path",{d:"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11",key:"f3b9sd"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q4=A("Upload",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G4=A("UserPlus",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"19",x2:"19",y1:"8",y2:"14",key:"1bvyxn"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y4=A("Users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X4=A("Volume2",[["path",{d:"M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",key:"uqj9uw"}],["path",{d:"M16 9a5 5 0 0 1 0 6",key:"1q6k2b"}],["path",{d:"M19.364 18.364a9 9 0 0 0 0-12.728",key:"ijwkga"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z4=A("VolumeX",[["path",{d:"M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",key:"uqj9uw"}],["line",{x1:"22",x2:"16",y1:"9",y2:"15",key:"1ewh16"}],["line",{x1:"16",x2:"22",y1:"9",y2:"15",key:"5ykzw1"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J4=A("Wrench",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",key:"cbrjhi"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ex=A("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);var tx=eg();const ly="@firebase/installations",Od="0.6.18";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ay=1e4,uy=`w:${Od}`,cy="FIS_v2",NS="https://firebaseinstallations.googleapis.com/v1",RS=3600*1e3,PS="installations",AS="Installations";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const MS={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."},Rr=new kl(PS,AS,MS);function dy(n){return n instanceof Mr&&n.code.includes("request-failed")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function hy({projectId:n}){return`${NS}/projects/${n}/installations`}function fy(n){return{token:n.token,requestStatus:2,expiresIn:OS(n.expiresIn),creationTime:Date.now()}}async function py(n,e){const s=(await e.json()).error;return Rr.create("request-failed",{requestName:n,serverCode:s.code,serverMessage:s.message,serverStatus:s.status})}function my({apiKey:n}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":n})}function DS(n,{refreshToken:e}){const r=my(n);return r.append("Authorization",LS(e)),r}async function gy(n){const e=await n();return e.status>=500&&e.status<600?n():e}function OS(n){return Number(n.replace("s","000"))}function LS(n){return`${cy} ${n}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function bS({appConfig:n,heartbeatServiceProvider:e},{fid:r}){const s=hy(n),l=my(n),u=e.getImmediate({optional:!0});if(u){const g=await u.getHeartbeatsHeader();g&&l.append("x-firebase-client",g)}const d={fid:r,authVersion:cy,appId:n.appId,sdkVersion:uy},f={method:"POST",headers:l,body:JSON.stringify(d)},m=await gy(()=>fetch(s,f));if(m.ok){const g=await m.json();return{fid:g.fid||r,registrationStatus:2,refreshToken:g.refreshToken,authToken:fy(g.authToken)}}else throw await py("Create Installation",m)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function _y(n){return new Promise(e=>{setTimeout(e,n)})}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function FS(n){return btoa(String.fromCharCode(...n)).replace(/\+/g,"-").replace(/\//g,"_")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const US=/^[cdef][\w-]{21}$/,Bc="";function BS(){try{const n=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(n),n[0]=112+n[0]%16;const r=zS(n);return US.test(r)?r:Bc}catch{return Bc}}function zS(n){return FS(n).substr(0,22)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ql(n){return`${n.appName}!${n.appId}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const yy=new Map;function vy(n,e){const r=ql(n);wy(r,e),jS(r,e)}function wy(n,e){const r=yy.get(n);if(r)for(const s of r)s(e)}function jS(n,e){const r=HS();r&&r.postMessage({key:n,fid:e}),VS()}let wr=null;function HS(){return!wr&&"BroadcastChannel"in self&&(wr=new BroadcastChannel("[Firebase] FID Change"),wr.onmessage=n=>{wy(n.data.key,n.data.fid)}),wr}function VS(){yy.size===0&&wr&&(wr.close(),wr=null)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const WS="firebase-installations-database",$S=1,Pr="firebase-installations-store";let oc=null;function Ld(){return oc||(oc=El(WS,$S,{upgrade:(n,e)=>{switch(e){case 0:n.createObjectStore(Pr)}}})),oc}async function wl(n,e){const r=ql(n),l=(await Ld()).transaction(Pr,"readwrite"),u=l.objectStore(Pr),d=await u.get(r);return await u.put(e,r),await l.done,(!d||d.fid!==e.fid)&&vy(n,e.fid),e}async function ky(n){const e=ql(n),s=(await Ld()).transaction(Pr,"readwrite");await s.objectStore(Pr).delete(e),await s.done}async function Kl(n,e){const r=ql(n),l=(await Ld()).transaction(Pr,"readwrite"),u=l.objectStore(Pr),d=await u.get(r),f=e(d);return f===void 0?await u.delete(r):await u.put(f,r),await l.done,f&&(!d||d.fid!==f.fid)&&vy(n,f.fid),f}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function bd(n){let e;const r=await Kl(n.appConfig,s=>{const l=qS(s),u=KS(n,l);return e=u.registrationPromise,u.installationEntry});return r.fid===Bc?{installationEntry:await e}:{installationEntry:r,registrationPromise:e}}function qS(n){const e=n||{fid:BS(),registrationStatus:0};return Cy(e)}function KS(n,e){if(e.registrationStatus===0){if(!navigator.onLine){const l=Promise.reject(Rr.create("app-offline"));return{installationEntry:e,registrationPromise:l}}const r={fid:e.fid,registrationStatus:1,registrationTime:Date.now()},s=QS(n,r);return{installationEntry:r,registrationPromise:s}}else return e.registrationStatus===1?{installationEntry:e,registrationPromise:GS(n)}:{installationEntry:e}}async function QS(n,e){try{const r=await bS(n,e);return wl(n.appConfig,r)}catch(r){throw dy(r)&&r.customData.serverCode===409?await ky(n.appConfig):await wl(n.appConfig,{fid:e.fid,registrationStatus:0}),r}}async function GS(n){let e=await Wm(n.appConfig);for(;e.registrationStatus===1;)await _y(100),e=await Wm(n.appConfig);if(e.registrationStatus===0){const{installationEntry:r,registrationPromise:s}=await bd(n);return s||r}return e}function Wm(n){return Kl(n,e=>{if(!e)throw Rr.create("installation-not-found");return Cy(e)})}function Cy(n){return YS(n)?{fid:n.fid,registrationStatus:0}:n}function YS(n){return n.registrationStatus===1&&n.registrationTime+ay<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function XS({appConfig:n,heartbeatServiceProvider:e},r){const s=ZS(n,r),l=DS(n,r),u=e.getImmediate({optional:!0});if(u){const g=await u.getHeartbeatsHeader();g&&l.append("x-firebase-client",g)}const d={installation:{sdkVersion:uy,appId:n.appId}},f={method:"POST",headers:l,body:JSON.stringify(d)},m=await gy(()=>fetch(s,f));if(m.ok){const g=await m.json();return fy(g)}else throw await py("Generate Auth Token",m)}function ZS(n,{fid:e}){return`${hy(n)}/${e}/authTokens:generate`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Fd(n,e=!1){let r;const s=await Kl(n.appConfig,u=>{if(!Ey(u))throw Rr.create("not-registered");const d=u.authToken;if(!e&&tT(d))return u;if(d.requestStatus===1)return r=JS(n,e),u;{if(!navigator.onLine)throw Rr.create("app-offline");const f=rT(u);return r=eT(n,f),f}});return r?await r:s.authToken}async function JS(n,e){let r=await $m(n.appConfig);for(;r.authToken.requestStatus===1;)await _y(100),r=await $m(n.appConfig);const s=r.authToken;return s.requestStatus===0?Fd(n,e):s}function $m(n){return Kl(n,e=>{if(!Ey(e))throw Rr.create("not-registered");const r=e.authToken;return iT(r)?Object.assign(Object.assign({},e),{authToken:{requestStatus:0}}):e})}async function eT(n,e){try{const r=await XS(n,e),s=Object.assign(Object.assign({},e),{authToken:r});return await wl(n.appConfig,s),r}catch(r){if(dy(r)&&(r.customData.serverCode===401||r.customData.serverCode===404))await ky(n.appConfig);else{const s=Object.assign(Object.assign({},e),{authToken:{requestStatus:0}});await wl(n.appConfig,s)}throw r}}function Ey(n){return n!==void 0&&n.registrationStatus===2}function tT(n){return n.requestStatus===2&&!nT(n)}function nT(n){const e=Date.now();return e<n.creationTime||n.creationTime+n.expiresIn<e+RS}function rT(n){const e={requestStatus:1,requestTime:Date.now()};return Object.assign(Object.assign({},n),{authToken:e})}function iT(n){return n.requestStatus===1&&n.requestTime+ay<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function sT(n){const e=n,{installationEntry:r,registrationPromise:s}=await bd(e);return s?s.catch(console.error):Fd(e).catch(console.error),r.fid}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function oT(n,e=!1){const r=n;return await lT(r),(await Fd(r,e)).token}async function lT(n){const{registrationPromise:e}=await bd(n);e&&await e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function aT(n){if(!n||!n.options)throw lc("App Configuration");if(!n.name)throw lc("App Name");const e=["projectId","apiKey","appId"];for(const r of e)if(!n.options[r])throw lc(r);return{appName:n.name,projectId:n.options.projectId,apiKey:n.options.apiKey,appId:n.options.appId}}function lc(n){return Rr.create("missing-app-config-values",{valueName:n})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Sy="installations",uT="installations-internal",cT=n=>{const e=n.getProvider("app").getImmediate(),r=aT(e),s=Rs(e,"heartbeat");return{app:e,appConfig:r,heartbeatServiceProvider:s,_delete:()=>Promise.resolve()}},dT=n=>{const e=n.getProvider("app").getImmediate(),r=Rs(e,Sy).getImmediate();return{getId:()=>sT(r),getToken:l=>oT(r,l)}};function hT(){Cn(new bt(Sy,cT,"PUBLIC")),Cn(new bt(uT,dT,"PRIVATE"))}hT();Ot(ly,Od);Ot(ly,Od,"esm2017");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const fT="/firebase-messaging-sw.js",pT="/firebase-cloud-messaging-push-scope",Ty="BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4",mT="https://fcmregistrations.googleapis.com/v1",Iy="google.c.a.c_id",gT="google.c.a.c_l",_T="google.c.a.ts",yT="google.c.a.e",qm=1e4;var Km;(function(n){n[n.DATA_MESSAGE=1]="DATA_MESSAGE",n[n.DISPLAY_NOTIFICATION=3]="DISPLAY_NOTIFICATION"})(Km||(Km={}));/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */var xs;(function(n){n.PUSH_RECEIVED="push-received",n.NOTIFICATION_CLICKED="notification-clicked"})(xs||(xs={}));/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yn(n){const e=new Uint8Array(n);return btoa(String.fromCharCode(...e)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")}function vT(n){const e="=".repeat((4-n.length%4)%4),r=(n+e).replace(/\-/g,"+").replace(/_/g,"/"),s=atob(r),l=new Uint8Array(s.length);for(let u=0;u<s.length;++u)l[u]=s.charCodeAt(u);return l}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ac="fcm_token_details_db",wT=5,Qm="fcm_token_object_Store";async function kT(n){if("databases"in indexedDB&&!(await indexedDB.databases()).map(u=>u.name).includes(ac))return null;let e=null;return(await El(ac,wT,{upgrade:async(s,l,u,d)=>{var f;if(l<2||!s.objectStoreNames.contains(Qm))return;const m=d.objectStore(Qm),g=await m.index("fcmSenderId").get(n);if(await m.clear(),!!g){if(l===2){const y=g;if(!y.auth||!y.p256dh||!y.endpoint)return;e={token:y.fcmToken,createTime:(f=y.createTime)!==null&&f!==void 0?f:Date.now(),subscriptionOptions:{auth:y.auth,p256dh:y.p256dh,endpoint:y.endpoint,swScope:y.swScope,vapidKey:typeof y.vapidKey=="string"?y.vapidKey:yn(y.vapidKey)}}}else if(l===3){const y=g;e={token:y.fcmToken,createTime:y.createTime,subscriptionOptions:{auth:yn(y.auth),p256dh:yn(y.p256dh),endpoint:y.endpoint,swScope:y.swScope,vapidKey:yn(y.vapidKey)}}}else if(l===4){const y=g;e={token:y.fcmToken,createTime:y.createTime,subscriptionOptions:{auth:yn(y.auth),p256dh:yn(y.p256dh),endpoint:y.endpoint,swScope:y.swScope,vapidKey:yn(y.vapidKey)}}}}}})).close(),await Qu(ac),await Qu("fcm_vapid_details_db"),await Qu("undefined"),CT(e)?e:null}function CT(n){if(!n||!n.subscriptionOptions)return!1;const{subscriptionOptions:e}=n;return typeof n.createTime=="number"&&n.createTime>0&&typeof n.token=="string"&&n.token.length>0&&typeof e.auth=="string"&&e.auth.length>0&&typeof e.p256dh=="string"&&e.p256dh.length>0&&typeof e.endpoint=="string"&&e.endpoint.length>0&&typeof e.swScope=="string"&&e.swScope.length>0&&typeof e.vapidKey=="string"&&e.vapidKey.length>0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ET="firebase-messaging-database",ST=1,Ar="firebase-messaging-store";let uc=null;function Ud(){return uc||(uc=El(ET,ST,{upgrade:(n,e)=>{switch(e){case 0:n.createObjectStore(Ar)}}})),uc}async function xy(n){const e=zd(n),s=await(await Ud()).transaction(Ar).objectStore(Ar).get(e);if(s)return s;{const l=await kT(n.appConfig.senderId);if(l)return await Bd(n,l),l}}async function Bd(n,e){const r=zd(n),l=(await Ud()).transaction(Ar,"readwrite");return await l.objectStore(Ar).put(e,r),await l.done,e}async function TT(n){const e=zd(n),s=(await Ud()).transaction(Ar,"readwrite");await s.objectStore(Ar).delete(e),await s.done}function zd({appConfig:n}){return n.appId}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const IT={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"only-available-in-window":"This method is available in a Window context.","only-available-in-sw":"This method is available in a service worker context.","permission-default":"The notification permission was not granted and dismissed instead.","permission-blocked":"The notification permission was not granted and blocked instead.","unsupported-browser":"This browser doesn't support the API's required to use the Firebase SDK.","indexed-db-unsupported":"This browser doesn't support indexedDb.open() (ex. Safari iFrame, Firefox Private Browsing, etc)","failed-service-worker-registration":"We are unable to register the default service worker. {$browserErrorMessage}","token-subscribe-failed":"A problem occurred while subscribing the user to FCM: {$errorInfo}","token-subscribe-no-token":"FCM returned no token when subscribing the user to push.","token-unsubscribe-failed":"A problem occurred while unsubscribing the user from FCM: {$errorInfo}","token-update-failed":"A problem occurred while updating the user from FCM: {$errorInfo}","token-update-no-token":"FCM returned no token when updating the user to push.","use-sw-after-get-token":"The useServiceWorker() method may only be called once and must be called before calling getToken() to ensure your service worker is used.","invalid-sw-registration":"The input to useServiceWorker() must be a ServiceWorkerRegistration.","invalid-bg-handler":"The input to setBackgroundMessageHandler() must be a function.","invalid-vapid-key":"The public VAPID key must be a string.","use-vapid-key-after-get-token":"The usePublicVapidKey() method may only be called once and must be called before calling getToken() to ensure your VAPID key is used."},rt=new kl("messaging","Messaging",IT);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function xT(n,e){const r=await Hd(n),s=Ry(e),l={method:"POST",headers:r,body:JSON.stringify(s)};let u;try{u=await(await fetch(jd(n.appConfig),l)).json()}catch(d){throw rt.create("token-subscribe-failed",{errorInfo:d==null?void 0:d.toString()})}if(u.error){const d=u.error.message;throw rt.create("token-subscribe-failed",{errorInfo:d})}if(!u.token)throw rt.create("token-subscribe-no-token");return u.token}async function NT(n,e){const r=await Hd(n),s=Ry(e.subscriptionOptions),l={method:"PATCH",headers:r,body:JSON.stringify(s)};let u;try{u=await(await fetch(`${jd(n.appConfig)}/${e.token}`,l)).json()}catch(d){throw rt.create("token-update-failed",{errorInfo:d==null?void 0:d.toString()})}if(u.error){const d=u.error.message;throw rt.create("token-update-failed",{errorInfo:d})}if(!u.token)throw rt.create("token-update-no-token");return u.token}async function Ny(n,e){const s={method:"DELETE",headers:await Hd(n)};try{const u=await(await fetch(`${jd(n.appConfig)}/${e}`,s)).json();if(u.error){const d=u.error.message;throw rt.create("token-unsubscribe-failed",{errorInfo:d})}}catch(l){throw rt.create("token-unsubscribe-failed",{errorInfo:l==null?void 0:l.toString()})}}function jd({projectId:n}){return`${mT}/projects/${n}/registrations`}async function Hd({appConfig:n,installations:e}){const r=await e.getToken();return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":n.apiKey,"x-goog-firebase-installations-auth":`FIS ${r}`})}function Ry({p256dh:n,auth:e,endpoint:r,vapidKey:s}){const l={web:{endpoint:r,auth:e,p256dh:n}};return s!==Ty&&(l.web.applicationPubKey=s),l}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const RT=10080*60*1e3;async function PT(n){const e=await DT(n.swRegistration,n.vapidKey),r={vapidKey:n.vapidKey,swScope:n.swRegistration.scope,endpoint:e.endpoint,auth:yn(e.getKey("auth")),p256dh:yn(e.getKey("p256dh"))},s=await xy(n.firebaseDependencies);if(s){if(OT(s.subscriptionOptions,r))return Date.now()>=s.createTime+RT?MT(n,{token:s.token,createTime:Date.now(),subscriptionOptions:r}):s.token;try{await Ny(n.firebaseDependencies,s.token)}catch(l){console.warn(l)}return Gm(n.firebaseDependencies,r)}else return Gm(n.firebaseDependencies,r)}async function AT(n){const e=await xy(n.firebaseDependencies);e&&(await Ny(n.firebaseDependencies,e.token),await TT(n.firebaseDependencies));const r=await n.swRegistration.pushManager.getSubscription();return r?r.unsubscribe():!0}async function MT(n,e){try{const r=await NT(n.firebaseDependencies,e),s=Object.assign(Object.assign({},e),{token:r,createTime:Date.now()});return await Bd(n.firebaseDependencies,s),r}catch(r){throw r}}async function Gm(n,e){const s={token:await xT(n,e),createTime:Date.now(),subscriptionOptions:e};return await Bd(n,s),s.token}async function DT(n,e){const r=await n.pushManager.getSubscription();return r||n.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:vT(e)})}function OT(n,e){const r=e.vapidKey===n.vapidKey,s=e.endpoint===n.endpoint,l=e.auth===n.auth,u=e.p256dh===n.p256dh;return r&&s&&l&&u}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ym(n){const e={from:n.from,collapseKey:n.collapse_key,messageId:n.fcmMessageId};return LT(e,n),bT(e,n),FT(e,n),e}function LT(n,e){if(!e.notification)return;n.notification={};const r=e.notification.title;r&&(n.notification.title=r);const s=e.notification.body;s&&(n.notification.body=s);const l=e.notification.image;l&&(n.notification.image=l);const u=e.notification.icon;u&&(n.notification.icon=u)}function bT(n,e){e.data&&(n.data=e.data)}function FT(n,e){var r,s,l,u,d;if(!e.fcmOptions&&!(!((r=e.notification)===null||r===void 0)&&r.click_action))return;n.fcmOptions={};const f=(l=(s=e.fcmOptions)===null||s===void 0?void 0:s.link)!==null&&l!==void 0?l:(u=e.notification)===null||u===void 0?void 0:u.click_action;f&&(n.fcmOptions.link=f);const m=(d=e.fcmOptions)===null||d===void 0?void 0:d.analytics_label;m&&(n.fcmOptions.analyticsLabel=m)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function UT(n){return typeof n=="object"&&!!n&&Iy in n}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function BT(n){if(!n||!n.options)throw cc("App Configuration Object");if(!n.name)throw cc("App Name");const e=["projectId","apiKey","appId","messagingSenderId"],{options:r}=n;for(const s of e)if(!r[s])throw cc(s);return{appName:n.name,projectId:r.projectId,apiKey:r.apiKey,appId:r.appId,senderId:r.messagingSenderId}}function cc(n){return rt.create("missing-app-config-values",{valueName:n})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zT{constructor(e,r,s){this.deliveryMetricsExportedToBigQueryEnabled=!1,this.onBackgroundMessageHandler=null,this.onMessageHandler=null,this.logEvents=[],this.isLogServiceStarted=!1;const l=BT(e);this.firebaseDependencies={app:e,appConfig:l,installations:r,analyticsProvider:s}}_delete(){return Promise.resolve()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Py(n){try{n.swRegistration=await navigator.serviceWorker.register(fT,{scope:pT}),n.swRegistration.update().catch(()=>{}),await jT(n.swRegistration)}catch(e){throw rt.create("failed-service-worker-registration",{browserErrorMessage:e==null?void 0:e.message})}}async function jT(n){return new Promise((e,r)=>{const s=setTimeout(()=>r(new Error(`Service worker not registered after ${qm} ms`)),qm),l=n.installing||n.waiting;n.active?(clearTimeout(s),e()):l?l.onstatechange=u=>{var d;((d=u.target)===null||d===void 0?void 0:d.state)==="activated"&&(l.onstatechange=null,clearTimeout(s),e())}:(clearTimeout(s),r(new Error("No incoming service worker found.")))})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function HT(n,e){if(!e&&!n.swRegistration&&await Py(n),!(!e&&n.swRegistration)){if(!(e instanceof ServiceWorkerRegistration))throw rt.create("invalid-sw-registration");n.swRegistration=e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function VT(n,e){e?n.vapidKey=e:n.vapidKey||(n.vapidKey=Ty)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ay(n,e){if(!navigator)throw rt.create("only-available-in-window");if(Notification.permission==="default"&&await Notification.requestPermission(),Notification.permission!=="granted")throw rt.create("permission-blocked");return await VT(n,e==null?void 0:e.vapidKey),await HT(n,e==null?void 0:e.serviceWorkerRegistration),PT(n)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function WT(n,e,r){const s=$T(e);(await n.firebaseDependencies.analyticsProvider.get()).logEvent(s,{message_id:r[Iy],message_name:r[gT],message_time:r[_T],message_device_time:Math.floor(Date.now()/1e3)})}function $T(n){switch(n){case xs.NOTIFICATION_CLICKED:return"notification_open";case xs.PUSH_RECEIVED:return"notification_foreground";default:throw new Error}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function qT(n,e){const r=e.data;if(!r.isFirebaseMessaging)return;n.onMessageHandler&&r.messageType===xs.PUSH_RECEIVED&&(typeof n.onMessageHandler=="function"?n.onMessageHandler(Ym(r)):n.onMessageHandler.next(Ym(r)));const s=r.data;UT(s)&&s[yT]==="1"&&await WT(n,r.messageType,s)}const Xm="@firebase/messaging",Zm="0.12.22";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const KT=n=>{const e=new zT(n.getProvider("app").getImmediate(),n.getProvider("installations-internal").getImmediate(),n.getProvider("analytics-internal"));return navigator.serviceWorker.addEventListener("message",r=>qT(e,r)),e},QT=n=>{const e=n.getProvider("messaging").getImmediate();return{getToken:s=>Ay(e,s)}};function GT(){Cn(new bt("messaging",KT,"PUBLIC")),Cn(new bt("messaging-internal",QT,"PRIVATE")),Ot(Xm,Zm),Ot(Xm,Zm,"esm2017")}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function YT(){try{await fg()}catch{return!1}return typeof window<"u"&&hg()&&X0()&&"serviceWorker"in navigator&&"PushManager"in window&&"Notification"in window&&"fetch"in window&&ServiceWorkerRegistration.prototype.hasOwnProperty("showNotification")&&PushSubscription.prototype.hasOwnProperty("getKey")}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function XT(n){if(!navigator)throw rt.create("only-available-in-window");return n.swRegistration||await Py(n),AT(n)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function nx(n=Vc()){return YT().then(e=>{if(!e)throw rt.create("unsupported-browser")},e=>{throw rt.create("indexed-db-unsupported")}),Rs(Ne(n),"messaging").getImmediate()}async function rx(n,e){return n=Ne(n),Ay(n,e)}function ix(n){return n=Ne(n),XT(n)}GT();export{a4 as $,cI as A,mI as B,vI as C,LI as D,BI as E,HI as F,jI as G,VI as H,WI as I,$I as J,qI as K,KI as L,QI as M,GI as N,YI as O,XI as P,ZI as Q,JI as R,e4 as S,t4 as T,n4 as U,r4 as V,i4 as W,s4 as X,l4 as Y,o4 as Z,u4 as _,dI as a,JT as a$,c4 as a0,d4 as a1,h4 as a2,f4 as a3,p4 as a4,g4 as a5,m4 as a6,_4 as a7,y4 as a8,v4 as a9,W4 as aA,$4 as aB,q4 as aC,K4 as aD,Q4 as aE,G4 as aF,Y4 as aG,X4 as aH,Z4 as aI,J4 as aJ,ex as aK,L0 as aL,ZT as aM,lI as aN,ix as aO,gC as aP,YC as aQ,Jm as aR,oI as aS,nx as aT,uI as aU,rx as aV,XC as aW,ZC as aX,rI as aY,tw as aZ,YT as a_,w4 as aa,k4 as ab,C4 as ac,E4 as ad,S4 as ae,T4 as af,I4 as ag,x4 as ah,eI as ai,tI as aj,N4 as ak,R4 as al,P4 as am,A4 as an,D4 as ao,M4 as ap,L4 as aq,O4 as ar,b4 as as,F4 as at,U4 as au,B4 as av,z4 as aw,j4 as ax,H4 as ay,V4 as az,hI as b,sI as b0,kC as b1,U_ as b2,dC as b3,tx as b4,ai as b5,F_ as b6,aI as b7,hC as b8,Td as b9,mC as ba,iI as bb,fI as c,pI as d,gI as e,_I as f,yI as g,wI as h,kI as i,CI as j,EI as k,SI as l,TI as m,II as n,NI as o,xI as p,RI as q,PI as r,AI as s,MI as t,DI as u,OI as v,bI as w,FI as x,UI as y,zI as z};
