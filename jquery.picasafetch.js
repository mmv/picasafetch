/*
* picasaweb album fecther with jQuery
* created by Miguel Ventura <miguel.ventura@gmail.com>
* licensed under GPL-2
*/
var picasawebGalleryLang = {
	nogoogle: 'Não foi possível estabelecer ligação ao serviço. Por favor tente mais tarde.',
	waitingfeed: 'A abrir galeria... por favor aguarde...',
	gotfeed: 'A processar galeria... por favor aguarde...',
	processerrorretry: 'Erro a processar galeria... a realizar nova tentativa',
	processerrornoretry: 'Erro a abrir galeria... por favor tente mais tarde.'
};

function picasawebGallery(user, album, id, $j, pass) {

	// load language
	var lang = picasawebGalleryLang;
	
	// check if another instance is already running or waiting for some asynchronous operation
	// if so, we don't want to get in the middle (it will cause problems with stuff such as google
	// feeds API)
	
	if (window.picasaWebStatus) {
		// already running?
		if (window.picasaWebStatus != pass) { // not our instance in a callback...
			window.setTimeout(function() {picasawebGallery(user,album,id,$j,null);}, 1000);
			return;
		}
	} else {
		// no other instances running: lock the door.
		window.picasaWebStatus = 'init';
	}
	
	
	// check arguments and initialize
	// go fetch the rest of Google's API if needed.
	
	if (!user || !album) return;
	if (id.substr(0,1)!='#') id = '#' + id;

	if (!jQuery && !$j) { window.alert('The PicasaWeb Gallery plugin requires jQuery to run.'); return; }
	
	if (!$j) return picasawebGallery(user,album,id,jQuery,window.picasaWebStatus);

    if (typeof(google) == 'undefined' || !google.load) { $j(id).text('Ga'); return; }
	if (!google.feeds || !google.feeds.Feed) {
		// we need to load the feeds API.
		// this will break your document if it was already closed
		// as at the time of testing the feeds API seems to use some document.write()
		google.load("feeds", "1");
		google.setOnLoadCallback(function() {
			window.picasaWebStatus = 'gfeed loaded';
			picasawebGallery(user,album,id,$j,window.picasaWebStatus);
		});
		return;
	}
	
	var feedURL = "http://picasaweb.google.com/data/feed/api/user/" +user+ "/album/" +album+ "?kind=photo";
	
	// libraries fetched... let's go get them feeds!
	$j(id).text(lang['waitingfeed']);
	var feed = new google.feeds.Feed(feedURL);
	feed.setResultFormat(google.feeds.Feed.XML_FORMAT);
	
	feed.setNumEntries(1000);

	// now do some parsing...

	var feedLoad = function(res, retries) {
		window.picasaWebStatus = 'loading';
		
		if (retries == null) retries = 0;
		if (retries > 4) {
			// max retries exceeded: we're aborting the process
			$j(id).text(lang['processerrornoretry']);
			// release the lock
			window.picasaWebStatus = null;
			return;
		}
		var appendHTML = '';
		var col = 0;

		$j(res.xmlDocument).find('entry').each(function() {
			var baseURL = $j(this).find('media\\:content').attr('url') ||
				$j(this).find('content').attr('url');
			var comment = $j(this).find('summary').text();
			if (++col > 3) { appendHTML += '</tr><tr>'; col = 1; }
			appendHTML +=
			'<td><a rel="lightbox['+album+']" class="lightbox JSnocheck" href="' + baseURL + '?imgmax=800" title="' +comment+ '">' +
				'<img class="tn" src="' + baseURL + '?imgmax=144"></img></a></td>';
		});
		
		if (col == 0 && appendHTML == "") { // error... let's retry
			window.setTimeout( function() {
				$j(id).text(lang['processerrorretry'] + ' (' + retries + ')');
				var feed = new google.feeds.Feed(feedURL + '&_=' + Math.random());
				feed.load(function(res) {feedLoad(res,++retries);});
			}, 5000);
			return;
		}

		// if we have lazy load support, we're going to use it
		// so we can gracefully handle large albums
		// otherwise we simply place everything into a table
		if (jQuery.fn.lazyload) {
			$j(id).html('<table class="gallery"><tr>' +
				appendHTML + '</tr></table>').find('img').lazyload({threshold: 400, placeholder: '/scripts/lightbox/loading.gif'});
		} else {
			$j(id).html('<table class="gallery"><tr>' + appendHTML + '</tr></table>');
		}

		// we're done: other invocations can now proceed...
		window.picasaWebStatus = null;
		
		// if we have Lightbox support, turn it on for the newly added images
		if (Lightbox && typeof(Lightbox.start) == 'function') {
			$j(id).find('a').each(function() {
				$j(this).click(function() {
					Lightbox.start(this); 
					return false;
				});
			});
		}
	};
	feed.load(feedLoad);
	
	window.picasaWebStatus = 'picasafeed wait';
}
