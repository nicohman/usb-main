var https = require("follow-redirects").https;
var cheerio = require("cheerio")
var releases = [];
releases.push({
	name:"Manjaro i3",
	check_new:async function(last, cb){
		https.get("https://manjaro.org/community-editions/", function(res){
			var data = "";
			res.on("data", function(bit){
				data +=bit;
			});
			res.on('end', function(err){
				var $ = cheerio.load(data);
				var links = $('div.text p a ');
				var done = false;
				links.each(function(item){
					if($(this).attr('href').indexOf('i3') !== -1 && !done){
						done = true
						console.log($(this).attr("href"));
						https.get($(this).attr("href"), function(res){
							var agg = "";
							res.on('data', function(bit){
								agg+=bit;
							})
							res.on('end', function(err){
								$ = cheerio.load(agg);
								var link = "https://osdn.net/"+$("a.mirror_link").last().attr("href");
								if(last == link){
									console.log("Bad!");
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
	partition:"/dev/sdg1"
})
releases[0].check_new("", function(link){
	if(link){
		https.get(link, function(res){
			res.on('data', function(bit){
				data += bit;
				console.log("data");
			})
		})
	}
});