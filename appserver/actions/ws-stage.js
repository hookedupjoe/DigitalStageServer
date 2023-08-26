'use strict';
const THIS_MODULE_NAME = 'ws-stage';
const THIS_MODULE_TITLE = 'Send and receive Websock data related to the stage';

var isSetup = false;
var wssMain = false;
var wsRoom;
var clients = {};
var users = {};

module.exports.setup = function setup(scope,options) {
    var config = scope;
    var $ = config.locals.$;
    // var OPEN_STATE = $.ws.WebSocket.OPEN;

    function Route() {
        this.name = THIS_MODULE_NAME;
        this.title = THIS_MODULE_TITLE;
    }

    function getPeopleSummary(){
        var tmpList = {};
        for( var aID in users ){
            var tmpPerson = users[aID];
            if( tmpPerson.profile && tmpPerson.socketid ){
                var tmpName = tmpPerson.profile.name || 'Anonymous';
                var tmpUserID = tmpPerson.userid || 'Anonymous';
                tmpList[aID] = {name:tmpName, userid: tmpUserID};
            }
        }
        return tmpList;
    }    

    function resendPeople(){
        wsRoom.sendDataToAll({action:'people', people: getPeopleSummary()});
    }

    
    function sendChat(theWS, theData){
        try {
            var tmpMsg = theData.message;
            var tmpUserID = theWS.userid;
            console.log('tmpMsg',tmpMsg);
            
            //ToDo: add who it is to and vis
            var tmpName = users[tmpUserID].profile.name;

            var tmpNameTo = '';
            if( users[tmpMsg.to] ){
                var tmpUser = users[tmpMsg.to];
                var tmpSocketID = tmpUser.socketid;
                console.log('tmpSocketID tmpUser',tmpSocketID, tmpUser);
                tmpNameTo = users[tmpMsg.to].profile.name
            }
            if( tmpMsg.to && (tmpMsg.vis == 'private')){
                wsRoom.sendDataToClient(tmpSocketID, {action:'chat', fromid: tmpUserID, fromname: tmpName, message: tmpMsg, toname: tmpNameTo})
                wsRoom.sendDataToClient(theWS.id, {action:'chat', fromid: tmpUserID, fromname: tmpName, message: tmpMsg, toname: tmpNameTo})
            } else {
                wsRoom.sendDataToAll({action:'chat', fromid: tmpUserID, fromname: tmpName, message: tmpMsg, toname: tmpNameTo})
            }
        } catch (error) {
            console.error("Error in send chat",error);
        }
    }

    function updateProfile(theWS, theData){
        var tmpSocketID = theWS.id;
        var tmpUserID = theData.userid;
        var tmpProfile = theData.profile;
        theWS.userid = tmpUserID;

        users[tmpUserID] = {
            socketid: tmpSocketID,
            userid: tmpUserID,
            profile: tmpProfile
        }

        clients[tmpSocketID] = clients[tmpSocketID] || {};
        clients[tmpSocketID].profile = tmpProfile;
        clients[tmpSocketID].userid = tmpUserID;
        resendPeople();
        //wsRoom.sendDataToAll({action:'people', people: people});
        //console.log('updateProfile',clients);
    }
    
    function onConnect(ws){
        //console.log('onConnect',ws.id);
        ws.userid = $.ws.mgr.getUniqueID();        
        ws.send(JSON.stringify({action: 'welcome', userid: ws.userid, id: ws.id, people:getPeopleSummary()}))
    }

    function onMessage(ws,data,isBinary){
        //console.log('onMessage from websocket room', ws.id, ''+data, isBinary );
        var tmpData = (''+data).trim();
        if( tmpData.startsWith('{')){
            tmpData = JSON.parse(tmpData);
        }
        if( tmpData.action ){
            if( tmpData.action == 'profile' && tmpData.profile){
                updateProfile(ws,tmpData);
            } else if( tmpData.action == 'chat'){
                sendChat(ws,tmpData);
            }
        }
    }

    function onSocketAdd(theID){
        //people[theID] = {profile:{name:''}};
        //console.log('onSocketAdd from websocket room',theID );
        //wsRoom.sendDataToAll({action:'people', people: people});
    }

    function onSocketRemove(theID){
        if( clients[theID] ){
            var tmpUserID = clients[theID].userid || '';
            var tmpUser = users[tmpUserID];
            if( tmpUser && tmpUser.socketid ){
                //--- Clear socket it to show not active, but keep user with ID here
                //     ToDo: cleanup to remove inactive after x period?
                tmpUser.socketid = '';
                //console.log('cleared socketid',tmpUserID);
            }
            delete clients[theID];
            resendPeople();
            //wsRoom.sendDataToAll({action:'people', people: people});
        }
        //console.log('onSocketRemove from websocket room',theID, clients);
    }

    if( options.websocket === true ){

        if( !isSetup ){
            wssMain = new $.ws.WebSocketServer({ noServer: true });
            wsRoom = new $.ws.WebSocketRoom({name:'stage', server: wssMain, onConnect: onConnect, onMessage: onMessage, onSocketAdd: onSocketAdd, onSocketRemove: onSocketRemove});

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