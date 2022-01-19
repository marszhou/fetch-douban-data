'use strict'

const axios = require('axios')
const cheerio = require('cheerio')
const fs = require('fs')
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const baseUrl = 'https://movie.douban.com/top250'

async function doubanMovieCrawler (url, movies = []) {
  const res = await axios.get(url)
  const $ = cheerio.load(res.data)

  const textMapFn = (index, el) => {
    return cheerio.load(el).text().trim()
  }
  const textFn = (el) => el.text().trim()
  const mapJoin = (els) => {
    return els.map(textMapFn).get()
  }

  $('.grid_view .item').each(async function () {

    const elem = $(this)
    const url = elem.find('.hd a').attr('href')
    console.log(url)
    const id = url.match(/[\d]+/)[0]
    const page = await axios.get(url)
    const $p = cheerio.load(page.data)
    const dom = new JSDOM(page.data)
    const $d = dom.window.document.querySelector.bind(dom.window.document)
    const $dd = dom.window.document.querySelectorAll.bind(dom.window.document)
    const $r = (reg) => (page.data.match(reg) || ['',''])[1].trim().split('/').map(s => s.trim())
    try{
    const movie = {id, title: $p('h1 span:nth-child(1)').text().trim(),
      year: $p('h1 span:nth-child(2)').text().trim().replace(/[\(\)]/g, ''),
      directors: mapJoin($p('[rel="v:directedBy"]')),
      scripts: mapJoin($p('#info > span:nth-child(3) > span.attrs > a')),
      actors: mapJoin($p('[rel="v:starring"]')),
      genres: mapJoin($p('[property="v:genre"]')),
      homepage: textFn($p('#info > a')),
      nations: $r(/<span class="pl">制片国家\/地区:<\/span>(.*)<br\/>/),
      langs: $r(/<span class="pl">语言:<\/span>(.*)<br\/>/),
      issueDates: mapJoin($p('[property="v:initialReleaseDate"]')),
      aliases: $r(/<span class="pl">又名:<\/span>(.*)<br\/>/),
      runTime: $p('[property="v:runtime"]').attr('content'),
      ratingAvg:textFn($p('[property="v:average"]')),
      ratings: mapJoin($p('.rating_per')),
      summary: textFn($p('[property="v:summary"]')),
      image: $p('[rel="v:image"]').attr('src'),
      trailor: {
        href:$p('.label-trailer > .related-pic-video').attr('href'),
        image: (((($d('.label-trailer > .related-pic-video')||{}).style||{}).backgroundImage||'').match(/^url\(([^)]*)\)$/)|| [])[1]
      },
      shortVideo: {
        href:$p('.label-short-video > .related-pic-video').attr('href'),
        image: (((($d('.label-short-video > .related-pic-video')||{}).style||{}).backgroundImage||'').match(/^url\(([^)]*)\)$/) || [])[1]
      },
      images: [...$dd('.related-pic-bd img')].map(el => el.getAttribute('src'))
    }
    fs.writeFileSync('./jsons/'+id+'.json', JSON.stringify(movie))
    // console.log(JSON.stringify(movie))
    // throw 0
    // process.exit()
    movies.push({
      title: elem.find('.info .hd .title').text().trim(),
      star: elem.find('.info .bd .star .rating_num').text().trim(),
      url: elem.find('.hd a').attr('href'),
      cover: elem.find('.pic img').attr('src'),
      info: elem.find('.info .bd').children('p').first().text().trim(),
      oneSentenceComment: elem.find('.info .bd .quote').text().trim()
    })
    } catch(e) {
      console.log('#############################', id)
      console.log(e)
      process.exit()
    }
    // console.log(elem.find('div').text())
    // process.exit()
  })

  const nextUrl = $('.next a').attr('href')
  if (nextUrl) {
    await doubanMovieCrawler(baseUrl + nextUrl, movies)
  } else {
    // console.log(movies)
    fs.writeFile('./jsons/movies.json', JSON.stringify(movies), function(err) {
      if (err) {
        console.log(err)
      } else {
        console.log('done')
      }
    })
  }
}

doubanMovieCrawler(baseUrl)
