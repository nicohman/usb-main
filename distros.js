var home = require('os').homedir;
var cdir = home + "/.config/usb-main";
var distdir = cdir+"/isos/";
var config = require(cdir+"/config.json");
var lasts = require(cdir+"/lasts.json");
var https = require("follow-redirects").https;
var cheerio = require("cheerio");
var request = require('request');
var fs = require('fs');

module.exports = {
    ubuntu: {
        name: "Ubuntu",
        short: "ubuntu",
        check_new: async function(last, cb) {
            request("http://cdimages.ubuntu.com/daily-live/current/MD5SUMS", function(err, res, body) {
                if (last === body) {
                    cb(false, body, "http://www.cdimages.ubuntu.com/daily-live/current/cosmic-desktop-amd64.iso");
                } else {
                    cb("http://www.cdimages.ubuntu.com/daily-live/current/cosmic-desktop-amd64.iso", body, "http://www.cdimages.ubuntu.com/daily-live/current/cosmic-desktop-amd64.iso");

                }
            });
        },
        partition: config.partitions.ubuntu,
        last: lasts.ubuntu
    },
    manjaro: {
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
                                    if (last === link) {
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
        partition: config.partitions.manjaro,
        last: lasts.manjaro
    },
    solus: {
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
        partition: config.partitions.solus,
        last: lasts.solus
    }
}