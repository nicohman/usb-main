var https = require("follow-redirects").https;
var cheerio = require("cheerio");
var request = require('request');
var exec = require("child_process").exec;
var ProgressBar = require('progress');
var fs = require('fs');
var releases = [];
var lasts = require("./lasts.json");
releases.push({
    name: "Manjaro i3",
    short: "manjaro",
    check_new: async function(last, cb) {
        https.get("https://manjaro.org/community-editions/", function(res) {
            var data = "";
            res.on("data", function(bit) {
                data += bit;
            });
            res.on('end', function(err) {
                var $ = cheerio.load(data);
                var links = $('div.text p a ');
                var done = false;
                links.each(function(item) {
                	var href = $(this).attr('href');
                    if (href.indexOf('i3') !== -1 && !done) {
                        done = true
                        https.get(href, function(res) {
                            var agg = "";
                            res.on('data', function(bit) {
                                agg += bit;
                            })
                            res.on('end', function(err) {
                                $ = cheerio.load(agg);
                                var link = "https://osdn.net/" + $("a.mirror_link").last().attr("href");
                                if (last == link) {
                                    cb(false)
                                } else {
                                    cb(link)
                                }
                            })
                        })
                    }
                })
            })
        })
    },
    partition: "/dev/sdg1",
    last: lasts.manjaro
});
releases.push({
	name:"Solus Budgie",
	short:"solus",
	check_new:async function(last, cb){
		request("https://stroblindustries.com/isos/Solus-3-Budgie.sha256sum", function(err, res, body){
			console.log(body);
			if(last === body){
				cb(false);	
			} else {
				cb("https://mirrors.rit.edu/solus/images/Solus-3-Budgie.iso", body);
			}
		})
	},
	partition:"/dev/sdh1",
	last:lasts.solus
})
function upLast(cb){
	fs.writeFile("./lasts.json", JSON.stringify(lasts), function(err){
		if (err) throw err;
		cb(true);
	})
}
function next(index) {
	if(releases[index]){
		var release = releases[index];
		console.log("Beginning update process for "+release.name);
        release.check_new(release.last, async function(link, last) {
            var progress;
            if (link) {
                console.log(release.name + " is not up to date. Downloading now.");
                var write = fs.createWriteStream(release.short+".iso");
                request(link).on('response', function(res) {
                    var len = parseInt(res.headers['content-length'], 10);
                    progress = new ProgressBar('  downloading [:bar] :rate/bps :percent :etas', {
                        complete: '=',
                        incomplete: ' ',
                        width: 20,
                        total: len
                    });
                }).on('data', function(chunk){
                	progress.tick(chunk.length);
                }).pipe(write);
                write.on('close', function(){
                	console.log('Finished downloading '+release.name);
                	if(last){
                		lasts[release.short] = last;
                	} else {
                		lasts[release.short] = link;
                	}
                	upLast(function(){
                		console.log("Updated update record to include the newest version of "+release.name);
                		next(index+1);
                		//exec("dd if=manjaro.iso of=" + releases[0].partition)
                	})
                })
            } else {
                console.log(release.name + " is up to date!");
            }
        })
	} else {
		console.log("All distros finished updating.");
	}
}
function up_all() {
	next(0);
}
up_all();