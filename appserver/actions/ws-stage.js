'use strict';

const THIS_MODULE_NAME = 'ws-stage';
const THIS_MODULE_TITLE = 'Send and receive Websock data related to the stage';
var isSetup = false;
var wssMain = false;
var wsRoom;

module.exports.setup = function setup(scope,options) {
    var config = scope;
    var $ = config.locals.$;
    // var OPEN_STATE = $.ws.WebSocket.OPEN;

    function Route() {
        this.name = THIS_MODULE_NAME;
        this.title = THIS_MODULE_TITLE;
    }

    
    function onMessage(ws,data,isBinary){
        console.log('onMessage from websocket room', ws.id, ''+data, isBinary );
    }
    function onSocketAdd(theID){
        console.log('onSocketAdd from websocket room',theID );
    }
    function onSocketRemove(theID){
        console.log('onSocketRemove from websocket room',theID );
    }

    if( options.websocket === true ){

        if( !isSetup ){
            wssMain = new $.ws.WebSocketServer({ noServer: true });
            wsRoom = new $.ws.WebSocketRoom({name:'stage', server: wssMain, onMessage: onMessage, onSocketAdd: onSocketAdd, onSocketRemove: onSocketRemove});

            isSetup = true;
            console.log('The stage has created new websock room')
        }
        
        return wssMain;
    }
    

    var base = Route.prototype;
    //==== End of common setup - add special stuff below
    //--- must have a "run" method *** 

    //--- Load the prototype
    base.run = function (req, res, next) {
        var self = this;
        return new Promise( async function (resolve, reject) {
            try {
                var tmpRet = {
                    status: true,
                    query:req.query
                }
                resolve(tmpRet);
            }
            catch (error) {
                console.log('Err : ' + error);
                reject(error);
            }

        });



    }








    //====== IMPORTANT --- --- --- --- --- --- --- --- --- --- 
    //====== End of Module / setup ==== Nothing new below this
    return async function processReq(req, res, next) {
        try {
            var tmpRoute = new Route();
            var tmpResults = await (tmpRoute.run(req, res, next));
            res.json({
                status: true,
                results: tmpResults
            })
        } catch (ex) {
            res.json({ status: false, error: ex.toString() })
        }
    }
};