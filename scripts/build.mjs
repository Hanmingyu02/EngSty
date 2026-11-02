import {mkdir,copyFile,rm,writeFile} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist');
for(const file of ['index.html','style.css','app.js','phrases.js','api-client.js'])await copyFile(file,`dist/${file}`);
await copyFile('.nojekyll','dist/.nojekyll');console.log('Built static site in dist/');

const backend=process.env.BACKEND_URL?.trim()||null;
if(backend){const url=new URL(backend);if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash||url.pathname!=="/")throw Error("BACKEND_URL must be an HTTPS origin");}
await writeFile("dist/config.js",`window.ENGSTY_CONFIG = ${JSON.stringify({apiBaseUrl:backend})};\n`);
