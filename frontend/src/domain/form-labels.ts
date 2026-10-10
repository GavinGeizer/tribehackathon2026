/** Labels verified against the original Truro 2023 PDF sections B, C and D.
 * Exact AcroForm names are retained; these labels distinguish identity roles.
 * Source: https://truro.ca/images/Town%20of%20Truro%20Building%20%20Development%20Application%20Form%202023.pdf
 * Reviewed 2026-10-10. Generic fields without verified placement retain their original names.
 */
const TRURO_LABELS:Record<string,string>={
 'Name':'Applicant name', 'Company':'Applicant company', 'Address':'Applicant contact address',
 'Name_2':'Owner name', 'Company Name':'Owner company', 'Address_2':'Owner contact address',
 'Site Address':'Site Address', 'Project DescriptionRow1':'Project description — line 1',
 'Project DescriptionRow2':'Project description — line 2', 'Project DescriptionRow3':'Project description — line 3',
};
export function officialFieldLabel(resourceId:string,name:string,fallback=name):string {
 return resourceId==='truro-building-development-application-2023'?(TRURO_LABELS[name]??fallback):fallback;
}
