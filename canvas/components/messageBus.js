// define('messageBus', function(){
export default function messageBus() {
    /**
     * Simple empty message bus to be reusable in whole project
     * @type {{}}
     */
    var messageBus = {};

    PIXI.EventTarget.call(messageBus);

//     return messageBus;
// });
}