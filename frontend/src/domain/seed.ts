import type { Project, ProjectDetails, ProjectDocument } from './types';
export function createProject(input:{name:string;contractor:string;client:string;details:ProjectDetails}):Project {
 if(!input.name.trim() || !input.details.address.trim()) throw new Error('Project name and address are required.');
 if(input.details.proposedArea!==null && (!Number.isFinite(input.details.proposedArea)||input.details.proposedArea<0)) throw new Error('Building area must be a nonnegative number or unknown.');
 if(input.details.storeys!==null && (!Number.isInteger(input.details.storeys)||input.details.storeys<1)) throw new Error('Storeys must be a positive whole number or unknown.');
 const at=new Date().toISOString();
 return {id:crypto.randomUUID(),name:input.name.trim(),contractor:input.contractor.trim(),client:input.client.trim(),details:{...input.details,address:input.details.address.trim()},documents:[],acknowledgements:[],activity:[{id:crypto.randomUUID(),at,message:'Project created. Facts and supporting documents require review.'}],createdAt:at,updatedAt:at,synthetic:false,forms:{answers:{},drafts:{}}};
}
export function createDemoProject():Project {
 const address='120 Example Lane, Halifax, NS (synthetic)';
 const p=createProject({name:'Juniper Studio storefront renovation',contractor:'Seabright Works (fictional)',client:'Juniper Studio (fictional)',details:{address,description:'Synthetic standalone storefront window replacement and interior layout changes. Not a mall leasehold. All names, documents and addresses are fictional.',proposedArea:450,storeys:2,externalWalls:true,onHrmRoad:null,rightOfWayWork:true,heritageProperty:null,energyDocument:null}});
 p.id='permitpath-synthetic-demo'; p.synthetic=true;
 function doc(id:string,name:string,type:ProjectDocument['documentType'],addr:string,text:string):ProjectDocument {
  return {id,name,documentType:type,text,pages:1,size:new TextEncoder().encode(text).length,uploadedAt:p.createdAt,fields:{projectAddress:{value:addr,evidence:`Project Address: ${addr}`,page:1,method:'explicit_label'}},method:'deterministic',uncertainties:[],warnings:[],synthetic:true,userConfirmedType:true};
 }
 p.documents=[doc('demo-construction','SYNTHETIC A-102-ConstructionPlan.txt','construction_plan',address,`SYNTHETIC DEMONSTRATION — not professionally verified.\nDocument Type: Construction Plan\nProject Address: ${address}\nExisting and proposed layout summary for standalone Juniper Studio: reception, retail area and storage. Storefront window replacement and interior partition changes. 450 square metres, two storeys. Summary demonstrates document presence only; dimensions and engineering adequacy require professional review.`),doc('demo-description','SYNTHETIC project-description-wrong-address.txt','project_description','122 Example Lane, Halifax, NS (synthetic)','SYNTHETIC DEMONSTRATION — intentionally incorrect address.\nDocument Type: Project Description\nProject Address: 122 Example Lane, Halifax, NS (synthetic)\nStandalone storefront window replacement and interior layout changes. Correct this address before relying on the packet.')];
 p.activity.push({id:'demo-seeded',at:p.createdAt,message:'Synthetic demonstration loaded: construction evidence present, elevations missing, road/heritage facts unknown, and one document address conflict. Deterministic text summaries; no AI or professional verification.'});
 return p;
}
