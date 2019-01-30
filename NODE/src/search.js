const downloadTorrent = require('./download');
const path = require('path');
const downloadFile = require('download');
const fs = require('fs');
const query = require('yify-search');
const util = require('util');
const torrentParser = require('./torrent-parser');
const emitter = require('./emitter');
const torrentSearch = require('torrent-search-api');
const cloudscrapper = require('cloudscraper');
const find = require('find');

var scrapper = util.promisify(cloudscrapper.get);
var searchyify = util.promisify(query.search);

function startDownloadMulti(searchName, rootPath, callback) {
	
	torrentSearch.enablePublicProviders();

	torrentSearch.search(searchName)
		.then((results) => {
			
			if (!results)
			{
				callback('failed');
				return ;
			}
			var i = 0;
			var success = false;

			while(i < results.length) {
				if(results[i].link != undefined || results[i].link !=  null) {
					if (results[i].seeds >= 20 || results[i].peers >= 30) {
						if (results[i].title.indexOf('720p') != -1 || results[i].title.indexOf('1080p') != -1) {
							var size = results[i].size.split(" ");				

							if (size[1] == 'MB') {
								if (size[0] < 3000 && size[0] > 100) {						

									var hash = results[i].link.split('/');
									var hashUpper = hash[hash.length - 1].split('.')[0].toUpperCase();
		
									var torrentUrl = "http://itorrents.org/torrent/" + hashUpper + ".torrent";
									var movieName = results[i].title;

									console.log(movieName);
									console.log(results[i]);

									scrapper(torrentUrl)
										.then((resp, body) => {
											var torrentPath = path.join(rootPath, 'torrents', movieName + '.torrent');
											var file = fs.openSync(torrentPath, 'w');
											fs.write(file, resp.body, 0, resp.body.length, () => {});

											return torrentPath;
										})
										.then((filePath) => {
																						
											var torrent_parsed = torrentParser.openTParser(filePath);
											var checkFile = "";

											torrent_parsed.files.forEach(function(file) {
												if (file.length > 70000) {
		
													var ext = file.name.slice(-3);

													if (ext.indexOf('mp4') != -1 || ext.indexOf('mkv') != -1 || ext.indexOf('avi') != -1)
													{
														checkFile = path.join(rootPath, 'downloads', file.path);
														movieName = file.name;
													}
												}
											})

											return {filepath: filePath, check: checkFile};
										})
										.then((Paths) => {
											var destPath = path.join(rootPath, 'downloads');

											if (fs.existsSync(Paths.check) == false) {
												downloadTorrent(Paths.filepath, destPath);
											}
											else {
												emitter.emit('ready', 1)
											}
										})
										.then(() => {
											success = true;
											emitter.emit('ready', 1)
											callback(movieName);
										})
										.catch((error) => {
											callback('failed')
										})

									break ;
								}
							}
						}
					}
				}
				i++;
			}

			return success;
		})
		.then((result) => {
			if (result == false)
			{
				console.log(result);
				callback('failed');
			}	
		})
		.catch((err) => {
			callback('failed')
		})
}

function startDownloadYTS(searchName, rootPath, callback) {
	searchyify(searchName)
		.then((result) => {
			
			if (result === undefined || result === null) {
				callback('failed');
				return false;
			}

			var movieName = result[0].slug;
			var runOnce = 0;

			result[0].torrents.forEach(function(torrent) {
				if (torrent.quality == '720p' && torrent.type == 'bluray' && runOnce == 0)
				{
					runOnce = 1;
					downloadFile(torrent.url)
						.then((data) => {
							var filePath = path.join(rootPath, 'torrents', movieName) + '.torrent';
							fs.writeFileSync(filePath, data);
							
							var torrent_parsed = torrentParser.openTParser(filePath);
							var checkFile = "";

							torrent_parsed.files.forEach(function(file) {
								if (file.length > 70000) {
									var ext = file.name.slice(-3);

									if (ext.indexOf('mp4') != -1 || ext.indexOf('mkv') != -1 || ext.indexOf('avi') != -1)
									{	
										checkFile = path.join(rootPath, 'downloads', file.path);
										movieName = file.name;
									}
										
								}
							})

							return {filepath: filePath, check: checkFile};
						})
						.then((Paths) => {
							var destPath = path.join(rootPath, 'downloads');

							if (fs.existsSync(Paths.check) == false) {
								downloadTorrent(Paths.filepath, destPath);
							}
							else {
								emitter.emit('ready', 1)
							}
						})
						.then(() => {
							callback(movieName);
						})
						.catch((error) => {
							callback('failed')
							console.log(error);
						});

				}
				else if (torrent.quality == '720p' && torrent.type == 'web' && runOnce == 0)
				{
					runOnce = 1;

					downloadFile(torrent.url)
						.then((data) => {
							console.log(movieName);
							var filePath = path.join(rootPath, 'torrents', movieName) + '.torrent';
							fs.writeFileSync(filePath, data);
							
							var torrent_parsed = torrentParser.openTParser(filePath);
							var checkFile = "";

							torrent_parsed.files.forEach(function(file) {
								if (file.length > 70000) {
									var ext = file.name.split('.');
									ext = ext[ext.length - 1];

									if (ext.indexOf('mp4') != -1 || ext.indexOf('mkv') != -1 || ext.indexOf('avi') != -1)
									{
										checkFile = path.join(rootPath, 'downloads', file.path);
										movieName = file.name;
									}
								}
							})

							return {filepath: filePath, check: checkFile};
						})
						.then((Paths) => {
							var destPath = path.join(rootPath, 'downloads');

							if (fs.existsSync(Paths.check) == false) {
								downloadTorrent(Paths.filepath, destPath);
							}
							else {
								emitter.emit('ready', 1)
							}
						})
						.then(() => {
							callback(movieName);
						})
						.catch((error) => {
							callback('failed')
							console.error(error);
						})
				}
			});
		})
		.catch((err) => {
			callback('failed', err);
		})
}

module.exports.startDownloadMulti = startDownloadMulti;
module.exports.startDownloadYTS = startDownloadYTS;
