// code here run in MAIN world as a js module
// but window.* references are isolated from MAIN world (because of being module)

export function haha(){
    console.log('haha');
    console.trace(123);
    console.log('window.dataLayer', window.dataLayer);
    console.log('window', window);
    alert(123);
}