import {describe,it,expect} from 'bun:test';
import worker from '../../server/index';
const call=(value:unknown,headers:Record<string,string>={})=>worker.fetch(new Request('https://permitpath.test/api/forms/assist',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(value)}),{});
const field={name:'Site Address',label:'Site Address',type:'text',options:[]};
const fact={id:'project:address',label:'projectAddress',value:'120 Example Lane',quote:'Site: 120 Example Lane',source:'User project record'};
describe('Form assistance route boundaries',()=>{
 it('requires same-origin requests',async()=>expect((await call({fields:[],facts:[]},{origin:'https://other.test'})).status).toBe(403));
 it('rejects undocumented input shape and ungrounded facts',async()=>{expect((await call({fields:[field],facts:[{...fact,value:'Invented'}]})).status).toBe(400);expect((await call({fields:[field],facts:[fact],code:'run'})).status).toBe(400);});
 it('rejects duplicate fields and oversized bodies',async()=>{expect((await call({fields:[field,field],facts:[fact]})).status).toBe(400);expect((await call({fields:[],facts:[],text:'x'.repeat(250001)})).status).toBe(413);});
 it('returns an honest no-model outcome without input facts',async()=>{const response=await call({fields:[field],facts:[]});expect(response.status).toBe(200);expect((await response.json()).method).toBe('deterministic');});
 it('keeps signatures outside the model input schema',async()=>{expect((await call({fields:[{...field,type:'signature'}],facts:[fact]})).status).toBe(400);});
});
