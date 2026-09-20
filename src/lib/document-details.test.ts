import { describe, expect, it } from 'vitest'
import { extractDocumentDetails } from './document-details'

describe('document detail extraction',()=>{
  it('stops a certificate number before the name-of-insured label',()=>{
    const result=extractDocumentDetails('vehicle_insurance.pdf',[{page:1,processed:true,text:`Certificate of Motor Insurance
Certificate number M008LM000141 Name of Insured Mr Example Driver
Effective date of commencement 12 June 2026
Date of expiry 11 June 2027`}])
    expect(result.fields).toContainEqual({label:'Policy / certificate number',value:'m008lm000141'})
    expect(result.fields).toContainEqual({label:'Policyholder / insured',value:'mr example driver'})
  })

  it('keeps a policy number split into two groups',()=>{
    const result=extractDocumentDetails('schedule.pdf',[{page:1,processed:true,text:'Policy No: MT20 021847640\nInsured: Mr Paul Lawrence\nPeriod of Insurance from 10 August 2026 to 10 August 2027'}])
    expect(result.fields).toContainEqual({label:'Policy / certificate number',value:'mt20 021847640'})
  })

  it('extracts premium, tax and total payable amounts',()=>{
    const result=extractDocumentDetails('schedule.pdf',[{page:1,processed:true,text:'Premium Due Plus Premium Tax (12.00%) Total Payable £3,076.64 £369.19 £3,445.83'}])
    expect(result.fields).toContainEqual({label:'Premium before tax',value:'£3,076.64'})
    expect(result.fields).toContainEqual({label:'Premium tax',value:'£369.19'})
    expect(result.fields).toContainEqual({label:'Total premium payable',value:'£3,445.83'})
  })
})
