import {mkdir,copyFile,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist');
for(const file of ['index.html','style.css','app.js','phrases.js'])await copyFile(file,`dist/${file}`);
await copyFile('.nojekyll','dist/.nojekyll');console.log('Built static site in dist/');
