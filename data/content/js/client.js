$(window).on('app-ready',function(){
	var fs = require('fs');
	var mime = require('mime');
	var path = require('path');
	var net = require('net');
	var socket;
	var rc = false;
	
	$('body').on('contextmenu', function(e){
		var el = e.srcElement;
		if(el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {} else {
			e.preventDefault();
			$("#contextmenu").hide();
		}
	});
	
	$(document).on('click', function(e){
		if ($(e.target).closest('#settingsButton').length != 0){
			$("#contextmenu").show().css({
				left:e.pageX,
				top:e.pageY
			});
		} else {
			$("#contextmenu").hide();
		}
	});

	
	function serverConnect(rc) {
		$('#loader').fadeIn();
		if(rc){
			socket.socket.connect();
			console.log('reConnecting...');
		} else {
			socket = io.connect('http://10.50.101.28:8800/');
			console.log('connecting...');
		}
	}
	
	serverConnect();
	socket.on('connect', function(){
	
	var prevChannel = '';
	var currentChannel = '';
	var currentSpeakers = [];
	
/*		Настройки		*/

	var settings = getSettingsObject();
	
	function getSettingsObject(){
		var contents = fs.readFileSync(__dirname+'\\settings.json','utf8');
		var settingsObject = JSON.parse(contents);
		return settingsObject;
	}
	
	function saveSetting(settingName,value){
		settings[settingName] = value;
		var string = JSON.stringify(settings);
		fs.writeFileSync(__dirname+'\\settings.json',string,'utf8');
	}
	
/*		Настройки - Конец		*/
	
	
/*		Эффекты		*/

	function scroll() {
		var $el=$('#messages .currentChannel');
		var height = $el[0].scrollHeight;
		$el.animate({scrollTop: height + "px"}, {queue: false}, 200);
	}
	
	function showLoader(){
		$('#loader').fadeIn();
	}
	
	function hideLoader(){
		$('#loader').fadeOut();
	}
	
/*		Эффекты - Конец		*/


/*			Регистрация			*/

	function showRegistration(){
		$('#loginPanel').slideUp(function(){
			$('#registrationPanel').slideDown();
		});
	}
	
	function isValidEmailAddress(emailAddress) {
		var pattern = new RegExp(/^(("[\w-\s]+")|([\w-]+(?:\.[\w-]+)*)|("[\w-\s]+")([\w-]+(?:\.[\w-]+)*))(@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][0-9]\.|1[0-9]{2}\.|[0-9]{1,2}\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){2}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\]?$)/i);
		return pattern.test(emailAddress);
    }

	function regSubmit() {
		var login = $('#regLoginField').val();
		var password = $('#regPasswordField').val();
		var mail = $('#regEmailField').val();		
		if(login == '' || password == '' || mail == ''){
			$('#regStatus').html("Надо заполнить полностью!").fadeIn().fadeOut(2000);
		} else if(password.length<6){
			$('#regStatus').html("Пароль должен быть больше 6 символов!").fadeIn().fadeOut(2000);
		} else if(!isValidEmailAddress(mail)){
			$('#regStatus').html("Адрес почты некорректен").fadeIn().fadeOut(2000);
		} else {
			socket.emit('userRegistration',{'login' : login,'password' : password,'email' : mail});
		}
	}
	
	function onRegistrationSuccess(data){
		$('#regStatus').html("OK").fadeIn().fadeOut(2000);		
	}
	
	function onRegistrationFailed(){
		$('#regStatus').html("Fail").fadeIn().fadeOut(2000);
	}
	
/*			Регистрация - Конец			*/


/*			Профиль			*/

	function saveProfileInfo(){
		var userName = $('#userName').val();
		var userSurname = $('#userSurname').val();
		var userBirthday = $('#userBirthday').val();
		socket.emit('profileInfo',{login:settings.login,userName:userName,userSurname:userSurname,userBirthday:userBirthday});
	}
	
	$('#avatarSelector').click(function(){
		window.frame.openDialog({
			type:'open',
			acceptTypes: { Images:['*.jpg','*.png'] },
			multiSelect:false,
			dirSelect:false
		},function(err,files){
			if(!err){
			var file = files[0];
			var type = mime.lookup(file);
			var stat = fs.statSync(file);
			var name = path.basename(file);
			var img = fs.readFileSync(file).toString('base64');
			$('#hideAvatar').attr('src',"data:image/png;base64," +img).load(function(){
				var avatar = document.getElementById("hideAvatar");
				if($('#hideAvatar').height() < 300 && $('#hideAvatar').width() < 250){
					var canvas=document.getElementById("avatar");
					var x=canvas.getContext("2d");
					x.drawImage(avatar,10,10);
				} else {
					alert("Слишком большая");
				}
			});	
			} else {console.log('error');}
		});
	});
	
/*			Профиль - Конец			*/


/*			Сообщения			*/

	function handleMessage(data){
		var channel=data.channel; 
		var dateString='<span>'+data.date.hours+':'+data.date.mins+'</span>';
		var content=data.content;
		if(data.login===settings.login){
			var authorString='<span class="author me">'+settings.login+'</span>';
		}else{
			var authorString='<span class="author">'+data.login+'</span>';
		}
		if(data.login===currentSpeakers[channel]){
			$('.channelContainer[data-channel='+channel+'] .messageContent').last().append('<br />'+content);
		}else{
			$('.channelContainer[data-channel='+channel+']').append('<div class="message"><div class="messageInfo">'
			+authorString+dateString+'</div><div class="messageContent">'+content+'</div></div>');
			currentSpeakers[channel]=data.login;
		}
		scroll();
	}
	
	function submitMessage(){
		var message=$('#messageField').val();
		$('#messageField').focus();
		if(message != ''){
			$('#messageField').val('');
			socket.emit('message',{content:message,channel:currentChannel});
		}
	}

/*			Сообщения - Конец			*/
	
	
/*			Авторизация			*/

	$('#loginField').val(settings.login);
	$('#autoLogin').prop("checked", settings.autoLogin);
	
	if(settings.login && settings.hash && settings.autoLogin===true){
		signIn();
	} else {
		hideLoader();
		$('#loginPanel').slideDown();
	}

	function signIn() {
		if($('#passwordField').val()!=''){
			showLoader();
			settings.login = $('#loginField').val();
			settings.password = $('#passwordField').val();
			saveSetting('login',settings.login);
			settings.autoLogin = $('#autoLogin').prop('checked');
			saveSetting('autoLogin',settings.autoLogin);
			socket.emit('login',{login:settings.login,password:settings.password});
		} else if(settings.login && settings.hash && settings.autoLogin===true){
			socket.emit('login',{login:settings.login,hash:settings.hash});
		} else {
			$('#signInStatus').html("Заполнено не все").fadeIn().fadeOut(2000);
		}
	}
	
	function loginError(error){
		$('#loginPanel').slideDown();
		hideLoader();
		$('#signInStatus').html(error).fadeIn().fadeOut(4000);
	}
	
	function onLoginSuccess(data){
		$('#userBar').html(settings.login);
		$('#overlay').fadeOut();
		$('#signInStatus').removeClass().html('').hide();
		$('#loginPanel').fadeOut();
		$('#serverOffline').fadeOut();
		$('#pageContainer').fadeIn();
		$('#userName').val(data.profileInfo.name);
		$('#userSurname').val(data.profileInfo.surname);
		$('#userBirthday').val(data.profileInfo.birthday);
		
		if(data.hash && settings.autoLogin===true) saveSetting('hash',data.hash);
	}
	
	function onLoginFinish(){
		hideLoader();
	}
	
	function showSignInForm(){
		$('#registrationPanel').slideUp(function(){
			$('#loginPanel').slideDown();
		});
	}
	
	function logOut(){
		$('#overlay').fadeIn();
		$('#loginPanel').fadeIn();
		$('#channelsRow').children().remove();
		$('.channelContainer').remove();
		$('.channelOnlineContainer').remove();
		$('#messages').children().remove();
		$('#autoLogin').removeAttr("checked");
		saveSetting('hash','');
		saveSetting('autoLogin','');
		socket.emit('logOut');
	}
	
/*			Авторизация - Конец			*/


/*			Действия			*/

	function openSettingsPage(){
		$('#overlay').fadeIn();
		$('#settings').fadeIn();
	}
	
	function openProfilePage(){
		$('#overlay').fadeIn();
		$('#profile').fadeIn();
	}
	
	$('[data-action=open]').click(function(){
		$('#overlay').fadeIn();
		var page = $(this).data('page');
		$('#'+page).fadeIn();
	});
	
	function openChannelsList(data){
		$('#overlay').fadeIn();
		$('#channelsList').html('');
		for(var i=0;i<data.channels.length;i++){
			$('#channelsList').append("<div class='channel'>" + data.channels[i].name + "</div>");
		}
		
		$('#channels').fadeIn();
	}
	
	$('[data-action=close]').click(function(){
		var page = $(this).closest('.page');
		$('#overlay').fadeOut(function(){
			page.fadeOut();
		});
	});
	
/*			Действия - Конец			*/	


/*			Каналы			*/

	function parseChannel(data){
		var channels = data.channels;
		for(var i = 0;i<channels.length;i++){
			var online = channels[i].online;
			var name = channels[i].name;
			var header = channels[i].header;
			
			$('#channelsRow').append('<div class="channelListItem" data-channel="'+name+'">'+name+'<span class="channelLeave"></span></div>');
			$('#messages').append('<div class="channelContainer" data-channel="'+name+'"></div>');
			currentSpeakers[name] = '';
			$('.channelContainer[data-channel='+name+']').append(header);
		
			if(i===0 && channels.length>1){
				currentChannel = name;
				$('#channelsRow').children('div').first().addClass('currentChannel activeTabItem');
				$('.channelContainer').first().addClass('currentChannel');
				$('#channelOnlineTab').append('<div class="channelOnlineContainer currentChannel" data-channel="'+name+'"></div>');
			}else{
				$('#channelOnlineTab').append('<div class="channelOnlineContainer" data-channel="'+name+'"></div>');
			}
			
			for(var ii = 0;ii<online.length;ii++){
				$('.channelOnlineContainer[data-channel='+name+']').append('<div data-login="'+online[ii]+'">'+online[ii]+'</div>');
			}
		}
	}
	
	function getChannels(){
		socket.emit('getChannels');
	}
	
	function addChannel(){
		var name = $('#addChannelField').val();
		$('#addChannelField').val('');
		socket.emit('createChannel',{channel:name});
	}
	
	function joinChannel(){
		var name = $(this).html();
		socket.emit('channelJoin',{login:settings.login,channel:name});
	}

	function channelClick(){
		$('div.channelContainer[data-channel='+currentChannel+']').hide();
		$('.channelOnlineContainer[data-channel='+currentChannel+']').hide();
		
		prevChannel = currentChannel;
		currentChannel = $(this).text();
		
		console.log(currentChannel);
		
		$('.currentChannel').removeClass('currentChannel activeTabItem');
		$('div.channelContainer[data-channel='+currentChannel+']').addClass('currentChannel').show();
		$('.channelOnlineContainer[data-channel='+currentChannel+']').addClass('currentChannel').show();
		$('.channelListItem[data-channel='+currentChannel+']').addClass('currentChannel activeTabItem');
	}
	
	function channelLeave(){
		var channel = $(this).parent().text();
		socket.emit('channelLeave',{channel:channel});
		$('*[data-channel='+channel+']').remove();
		$('.channelListItem').first().click();
	}
	
	function handleUserJoin(data){
		var channel = data.channel;
		var user = data.login;
		$('.channelContainer[data-channel='+channel+']').append('<div class="message"><span class="author">'+user+'</span> присоединился к каналу...</div>');
		$('.channelOnlineContainer[data-channel='+channel+']').append('<div data-login="'+user+'">'+user+'</div>');
		scroll();
		currentSpeakers[channel]='';
	}
	
	function handleUserLeave(data){
		var channel = data.channel;  
		if(channel !== ''){
			var user = data.login;
			$('.channelContainer[data-channel="'+channel+'"]').append('<div class="message"><span class="author">'+user+'</span> покинул канал...</div>');
			$('.channelOnlineContainer[data-channel='+channel+']').children('div[data-login='+user+']').remove();
		}
		scroll();
		currentSpeakers[channel]='';
	}
	
	function tabSwitch(){
		var index = $('#channelTabs a').index(this);
		$('.activeTab').removeClass('activeTab activeTabItem');
		$(this).addClass('activeTab activeTabItem');
		$('#tabs').animate({scrollLeft:index*400},{queue:false},300);
	}
	
/*			Каналы - Конец			*/
	
	
/*			События			*/

	socket.on('loginSuccessful',onLoginSuccess);
	socket.on('registrationSuccessful',onRegistrationSuccess);
	socket.on('registrationFailed',onRegistrationFailed);
	socket.on('profileInfoUpdateSuccessful');
	socket.on('profileInfoUpdateFailed');
	socket.on('loginError',loginError);
	socket.on('message',handleMessage);
	socket.on('userJoined',handleUserJoin);
	socket.on('userLeaved',handleUserLeave);
	socket.on('sendChannel',parseChannel);
	socket.on('loginProcedureFinish',onLoginFinish);
	socket.on('allChannels',openChannelsList);
	$('#profileSave').click(saveProfileInfo);
	$('#openChannels').click(getChannels);
	$('#sendMessage').click(submitMessage);
	$('#messageField').keypress(function(e){if(e.which===13){submitMessage();return false;}});
	$('.channel').live('dblclick',joinChannel);
	$('.channelListItem').live('click',channelClick);	
	$('.channelLeave').live('click',channelLeave);
	// лайв нужен, ничего зазорного
	$('#channelTabs').on('click','a',tabSwitch);
	$('#createChannel').on('click',addChannel);
	$('#signIn').on('click',signIn);
	$('#registration').on('click',showRegistration);
	$('#showLoginPanel').on('click',showSignInForm);
	$('#regSubmit').on('click',regSubmit);
	$('#logOut').on('click',logOut);
	
/*		События	- Конец		*/
	
});
socket.on('error', function(){
	$('#loader').fadeOut();
	$('#serverOffline').slideDown();
	setTimeout(function(){serverConnect(true);}, 20000);
	console.log("Ошибка соединения");
});
socket.on('disconnect', function(){
	$('#overlay').fadeIn();
	$('#channelsRow').children().remove();
	$('.channelContainer').remove();
	$('.channelOnlineContainer').remove();
	$('#messages').children().remove();
	$('#serverOffline').slideDown();
	//setTimeout(function(){serverConnect(true);}, 60000);
	// само коннектится оп экспоненте, при раскомменчивании возможно 2 реконнекта
	console.log("Дисконнект");
});
});