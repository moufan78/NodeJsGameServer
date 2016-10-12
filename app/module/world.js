/**
 * Created by egret on 16/10/10.
 */
var World = module.exports;

var WorldDataService = require('../data/worldDataService.js');
var WorldUser = require('../model/worldUser.js');
var UserSession = require('../../libs/session/userSession.js');
var UserSessionService = require('../../libs/session/userSessionService.js');
var Log = require('../../libs/log/log.js');
var BackMessage = require('../message/backMessage.js');
var SystemProto = require('../proto/systemProto.js');
var UserCache = require('../cache/userCache.js');

World.userOnline = function(data, session){
    var userId = data.userId;
    var userSessionId = data.userSessionId;
    var userGameServer = data.userGameServer;

    //在World服务器中保存用户数据
    var user = new WorldUser();
    user.id = userId;
    user.sessionId = userSessionId;
    user.gameServer = userGameServer;

    var userSession = new UserSession(userSessionId, session);

    WorldDataService.addUser(user, userSession);
    UserSessionService.addSession(userSession);

    //在Redis中获取用户详细数据
    UserCache.getUserById(userId, function(cacheDbUser){
        if(cacheDbUser){
            //通知对应的GameServer
            var sendMsg = new SystemProto.system_userJoinGame();
            sendMsg.userId = userId;
            sendMsg.userSessionId = userSessionId;
            sendMsg.userName = cacheDbUser.name;
            BackMessage.sendToGame(userGameServer, sendMsg);

            //通知对应的ChatServer
            var sendMsg = new SystemProto.system_userJoinChat();
            sendMsg.userId = userId;
            sendMsg.userSessionId = userSessionId;
            sendMsg.userName = cacheDbUser.name;
            sendMsg.unionId = '测试帮会';
            BackMessage.sendToChat(sendMsg);
        } else {
            Log.error('不存在用户缓存数据');
        }
    });
}

World.userOffline = function(data){
    var userSessionId = data.userSessionID;
    var userGameServer = data.userGameServer;

    var userSession = UserSessionService.getSession(userSessionId);
    userSession && userSession.close();

    //通知对应的GameServer
    var sendMsg = new SystemProto.system_userExitGame();
    sendMsg.userSessionId = userSessionId;
    BackMessage.sendToGame(userGameServer, sendMsg);

    //通知对应的ChatServer
    var sendMsg = new SystemProto.system_userExitChat();
    sendMsg.userSessionId = userSessionId;
    BackMessage.sendToChat(sendMsg);
}