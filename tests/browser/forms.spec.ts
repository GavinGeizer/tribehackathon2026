import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from '../../frontend/node_modules/pdf-lib/cjs/index.js';
import {createDemoProject} from '../../frontend/src/domain/seed';
async function setup(page:Page){
 const p=createDemoProject();p.documents=[];p.jurisdiction={province:'NS',municipality:'truro',municipalityName:'Truro',customerType:'individual',workflow:'manual'};
 await page.addInitScript((project)=>{localStorage.setItem('permitpath.projects.v1',JSON.stringify([project]));},p);
 await page.goto('/workspace');await page.getByRole('button',{name:'Open workspace'}).first().click();await page.getByRole('tab',{name:'Fill forms',exact:true}).click();
 return p;
}
async function openTruro(page:Page){const row=page.locator('.fw-form-row').filter({hasText:'Town of Truro Building & Development Application Form 2023'});await row.getByRole('button',{name:'Open form'}).click();await expect(page.getByText(/96 official fields/)).toBeVisible();}
test('browser official form: edit, save, reopen, export exact original fields',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);
 await expect(page.getByRole('heading',{name:'Forms identified for review'})).toBeVisible();
 await page.getByLabel('Are engineers, architects or interior design professionals involved?').selectOption('true');
 await expect(page.locator('.fw-list').filter({hasText:'Forms identified for review'})).toContainText('Schedule A');
 await openTruro(page);await page.getByRole('searchbox',{name:'Find a field'}).fill('Site Address');
 const address=page.locator('.fw-field').filter({hasText:'Site Address'}).getByRole('textbox');await address.fill('240 Browser Example Lane, Truro, NS (synthetic)');
 await address.press('Tab');await expect(page.getByRole('status')).toContainText('Draft saved');
 await page.getByRole('button',{name:'All project forms',exact:false}).click();await openTruro(page);await page.getByRole('searchbox',{name:'Find a field'}).fill('Site Address');await expect(address).toHaveValue('240 Browser Example Lane, Truro, NS (synthetic)');
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export draft',exact:true}).click();const download=await downloadPromise;const filename=info.outputPath('browser-filled-truro.pdf');await download.saveAs(filename);const pdf=await PDFDocument.load(await readFile(filename));expect(pdf.getForm().getFields()).toHaveLength(96);expect(pdf.getForm().getTextField('Site Address').getText()).toBe('240 Browser Example Lane, Truro, NS (synthetic)');expect(pdf.getForm().getTextField('Name').getText()??'').toBe('');
 await expect(page.getByRole('img',{name:'Official PDF with reviewed draft entries — page 1'})).toBeVisible();
 await expect.poll(()=>page.locator('.fw-preview canvas').evaluate((node:HTMLCanvasElement)=>{const context=node.getContext('2d');if(!context)return 0;const pixels=context.getImageData(0,0,node.width,node.height).data;let dark=0;for(let i=0;i<pixels.length;i+=16)if(pixels[i+3]>0&&pixels[i]<180)dark++;return dark;})).toBeGreaterThan(50);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
 await page.screenshot({path:info.outputPath('browser-form.png'),fullPage:true});
});
test('live AI form suggestions require explicit acceptance and preserve evidence',async({page})=>{
 await setup(page);await openTruro(page);
 const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/forms/assist')&&r.request().method()==='POST');await page.getByRole('button',{name:'Suggest autofill with AI'}).click();const response=await responsePromise;expect(response.ok()).toBe(true);const result=await response.json();if(process.env.REQUIRE_MODEL==='1')expect(result.method).toBe('model');
 await expect(page.getByRole('button',{name:'Suggest autofill with AI'})).toBeEnabled({timeout:50000});
 const suggestion=page.locator('.fw-suggestions article').filter({hasText:'Site Address'});await expect(suggestion).toBeVisible();await expect(suggestion).toContainText('120 Example Lane');await expect(suggestion).toContainText('Source:');
 await page.getByRole('searchbox',{name:'Find a field'}).fill('Site Address');const address=page.locator('.fw-field').filter({hasText:'Site Address'}).getByRole('textbox');await expect(address).toHaveValue('');
 await suggestion.getByRole('button',{name:'Use this value'}).click();await expect(address).toHaveValue('120 Example Lane, Halifax, NS (synthetic)');await expect(page.locator('.fw-field-source')).toContainText('Project details');await expect(page.getByRole('button',{name:/Save draft/})).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
