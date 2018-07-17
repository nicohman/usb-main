var program = require("commander");
var exec = require("child_process").execSync;
var Table = require('easy-table');
var ProgressBar = require('progress');
var fs = require('fs');
var releases = [];
var request = require('request');
var home = require('os').homedir;
var cdir = home + "/.config/usb-main";
var distdir = cdir + "/isos/";
var config = {
    enabled: [],
    partitions: {}
}
var lasts = {}
if (!fs.existsSync(cdir)) {
    fs.mkdirSync(cdir);
    fs.mkdirSync(cdir + "/isos");
    fs.writeFileSync(cdir + "/lasts.json", JSON.stringify(lasts));
    fs.writeFileSync(cdir + "/config.json", JSON.stringify(config));
}
config = require(cdir + "/config.json");
lasts = require(cdir + "/lasts.json");
var possible = require("./distros.js");
config.enabled.forEach(function(short) {
    releases.push(possible[short]);
});

function upLast(cb) {
    fs.writeFile(cdir + "/lasts.json", JSON.stringify(lasts), function(err) {
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
                var write = fs.createWriteStream(distdir + release.short + ".iso");
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
                        if (only) {
                            cb([release]);
                        } else {
                            next(index + 1, cb, force);
                        }
                    })
                })
            } else {
                console.log(release.name + " is up to date!");
                if (only) {
                    cb([release]);
                } else {
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
    next(0, cb, force);
}
async function burn(file, partition) {
    if (fs.existsSync(distdir + file + ".iso")) {
        console.log("Burning " + file + " to " + partition + ". This may take some time...");
        exec("sudo dd if=" + distdir + file + ".iso of=" + partition + " status=progress");
        return true;
    } else {
        console.log(file + " does not exist. Not burning");
        return false;
    }
}
async function burn_all(cb) {
    releases.forEach(async function(release) {
        if (release.partition) {
            await burn(release.short, release.partition);
        } else {
            console.log("No partition configured for " + release.name);
        }
    });
    console.log("Burnt all");
}
program.version("0.0.1");
program.command("burn <short> <interface>").description("Burn a distro to a specific partition").option("-f, --force", "Force updating/download").option("-c, --cached", "Do not sync distro before burning").action(async function(short, interface, cmd) {
    if (cmd.cached) {
        await burn(short, interface);
        console.log("Burnt cached file " + short + ".iso to " + interface);
    } else {
        var found = false;
        releases.forEach(function(release, index) {
            if (release.short == short) {
                found = true;
                console.log("Syncing only " + release.name);
                next(index, async function() {
                    console.log("Synced " + release.name + ", burning now");
                    await burn(short, interface);
                    console.log("Burnt file " + short + ".iso to " + interface);
                }, cmd.force, true);
            }
        });
        if (!found) {
            console.log("No enabled distro with that name.")
        }
    }
})
program.command("sync").description("Sync all local copies of isos").option("-o, --only [short]", "Only sync specific disto").option("-f, --force", "Force updating/download").action(async function(cmd) {
    if (cmd.only) {
        var found = false;
        releases.forEach(function(release, index) {
            if (release.short == cmd.only) {
                found = true;
                console.log("Syncing only " + release.name);
                next(index, function() {}, cmd.force, true);
            }
        });
        if (!found) {
            console.log("No enbaled distro with that name recognized. Try running `list`")
        }
    } else {
        sync_all(function() {}, cmd.force);
    }
});
program.command("list").description("List all configured distros").action(function() {
    if (releases.length > 0) {
        console.log("Enabled distros:");
        var t = new Table
        releases.forEach(function(release) {
            t.cell("Name", release.short);
            t.cell("Full Name", release.name);
            t.cell("Partition", release.partition || "N/A");
            t.newRow();
        });
        console.log(t.toString());
    };
    console.log("All distros:");
    var t2 = new Table;
    Object.keys(possible).forEach(function(short) {
        var release = possible[short];
        t2.cell("Name", release.short);
        t2.cell("Full Name", release.name);
        t2.cell("Partition", release.partition || "N/A");
        t2.newRow();
    })
    console.log(t2.toString());

})
program.command("update").description("Update and burn all configured distros to the configured partitions").option("-c, --cached", "Do not sync distros before burning").option("-f, --force", "Force updating/download").action(async function(cmd) {
    if (releases.length > 0) {
        if (cmd.cached) {
            await burn_all();
            console.log("Burnt all cached distros to partitions");
        } else {
            sync_all(async function(releases) {
                await burn_all();
                console.log("Burnt all distros to partitions");
            }, cmd.force);
        }
    } else {
        console.log("No enabled distros");
    }
})
program.parse(process.argv);