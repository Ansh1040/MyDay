const {chromium}=require('C:/Users/ansh0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(8000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url='file:///'+path.resolve(__dirname,'dist/index.html').replace(/\\/g,'/');
 await page.goto(url+'#discover');await page.getByRole('heading',{name:'A good day to wonder.'}).waitFor();
 await page.locator('#bottom [data-nav="you"]').click();
 for(const theme of ['vermilion','cobalt','plum','graphite']){await page.locator('button[data-theme="'+theme+'"]').click();for(const mode of ['day','night']){await page.locator('button[data-mode="'+mode+'"]').click();if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow '+theme+mode)}}
 await page.locator('#bottom [data-nav="discover"]').click();await page.locator('[data-tab="Explore"]').click();await page.getByRole('searchbox').fill('memory');await page.locator('[data-open="memory"]').first().click();
 await page.locator('[data-action="memory"]').click();await page.locator('[data-action="hideWords"]').click();await page.locator('#recall').fill('river lemon');await page.locator('[data-action="checkWords"]').click();await page.getByRole('heading',{name:'You recalled 2 of 6 words.'}).waitFor();await page.locator('[data-action="complete"]').click();await page.locator('[data-action="reflect"]').click();await page.locator('#noteText').fill('A test reflection');await page.locator('#noteForm button').click();await page.reload();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('elsewhere-preview-v1')));if(!saved.completed.includes('memory')||!saved.notes.some(n=>n.text==='A test reflection'))throw Error('Persistence failed');
 await page.setViewportSize({width:1440,height:1000});await page.goto(url+'#you');if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Desktop overflow');if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS: eight theme/mode combinations, mobile and desktop overflow, memory experiment, completion, reflection, reload persistence; no page errors.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
