var https = require("follow-redirects").https;
var cheerio = require("cheerio");
var request = require('request');
var program = require("commander");
var exec = require("child_process").exec;
var Table = require('easy-table');
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
                                    cb(false, link, link)
                                } else {
                                    cb(link, link, link)
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
    name: "Solus Budgie",
    short: "solus",
    check_new: async function(last, cb) {
        request("https://stroblindustries.com/isos/Solus-3-Budgie.sha256sum", function(err, res, body) {
            if (last === body) {
                cb(false, body, "https://mirrors.rit.edu/solus/images/Solus-3-Budgie.iso");
            } else {
                cb("https://mirrors.rit.edu/solus/images/Solus-3-Budgie.iso", body, "https://mirrors.rit.edu/solus/images/Solus-3-Budgie.iso");
            }
        })
    },
    partition: "/dev/sdh1",
    last: lasts.solus
});
releases.push({
    name: "Ubuntu",
    short: "ubuntu",
    check_new: async function(last, cb) {
        request("http://cdimages.ubuntu.com/daily-live/current/MD5SUMS", function(err, res, body) {
            if (last === body) {
                cb(false, body, "http://www.cdimages.ubuntu.com/daily-live/current/cosmic-desktop-amd64.iso");
            } else {
                cb("http://www.cdimages.ubuntu.com/daily-live/current/cosmic-desktop-amd64.iso", body, "http://www.cdimages.ubuntu.com/daily-live/current/cosmic-desktop-amd64.iso");

            }
        })
    },
    partition: "/dev/sdi1",
    last: lasts.ubuntu
})

function upLast(cb) {
    fs.writeFile("./lasts.json", JSON.stringify(lasts), function(err) {
        if (err) throw err;
        cb(true);
    })
}

function next(index, cb, force, only) {
    if (releases[index]) {
        var release = releases[index];
        console.log("Beginning update process for " + release.name);
        release.check_new(release.last, async function(link, last, flink) {
            var progress;
            if (link || force) {
                if (force) {
                    console.log("Forcing update for " + release.name);
                    link = flink;
                }
                console.log(release.name + " is not up to date. Downloading now.");
                var write = fs.createWriteStream(release.short + ".iso");
                request(link).on('response', function(res) {
                    var len = parseInt(res.headers['content-length'], 10);
                    progress = new ProgressBar('  downloading [:bar] :rate/bps :percent :etas', {
                        complete: '=',
                        incomplete: ' ',
                        width: 20,
                        total: len
                    });
                }).on('data', function(chunk) {
                    progress.tick(chunk.length);
                }).pipe(write);
                write.on('close', function() {
                    console.log('Finished downloading ' + release.name);
                    if (last) {
                        lasts[release.short] = last;
                    } else {
                        lasts[release.short] = link;
                    }
                    upLast(function() {
                        console.log("Updated update record to include the newest version of " + release.name);
                        if(only){
                            cb([release]);
                        } else {
                        next(index + 1, cb, force);
                    }
                    })
                })
            } else {
                console.log(release.name + " is up to date!");
                if(only){
                    cb([release]);
                } else{
                next(index + 1, cb, force);
}
            }
        })
    } else {
        console.log("All distros finished updating.");
        cb(releases);
    }
}

function sync_all(cb, force) {
    console.log("po")
    next(0, cb, force);
}
function burn(cb){

}
function burn_all(cb){

}
program.version("0.0.1");
program.command("burn <short> <interface>").description("Burn a distro to a specific partition").option("-c, --cached", "Do not sync distro before burning").action(function(cmd, short, interface) {
    console.log(short);
    console.log(interface);
})
program.command("sync").description("Sync all local copies of isos").option("-o, --only [short]", "Only sync specific disto").option("-f, --force", "Force updating/download").action(function(cmd) {
    console.log(cmd);
    if(cmd.only){
        var found = false;
        releases.forEach(function(release, index){
            if(release.short == cmd.only){
                found = true;
                console.log("Syncing only "+release.name);
                next(index, function(){}, cmd.force, true);
            }
        });
        if(!found){
            console.log("No distro with that name recognized. Try running `list`")
        }
    } else {
    sync_all(function() {
    }, cmd.force);
}
});
program.command("list").description("List all configured distros").action(function(){
    var t = new Table
    releases.forEach(function(release){
        t.cell("Name", release.short);
        t.cell("Full Name", release.name);
        t.cell("Partition", release.partition);
        t.newRow();
    });
    console.log(t.toString());
})
program.command("update").description("Update and burn all configured distros to the configured partitions").option("-c, --cached", "Do not sync distros before burning").option("-f, --force", "Force updating/download").action(function(cmd) {
    if(cmd.cached){

    } else {
    sync_all(function(releases) {
        releases.forEach(function(release) {
            //exec("dd if=" + short + ".iso of=" + release.partition)
        });
    }, cmd.force);
    }
})
program.parse(process.argv);
