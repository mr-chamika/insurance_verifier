import { describe, expect, it } from 'vitest'
import { verifyGoodsInTransit } from './goods-in-transit-verifier'

const now=new Date('2026-09-20T12:00:00Z')
const check=(text:string)=>verifyGoodsInTransit([{page:1,text,processed:true}],now)
const valid=`Goods in Transit Insurance Policy
Policy number: GIT-123456
Insured: Example Recovery Limited
Start date: 01/01/2026
Expiry date: 31/12/2026
Goods in Transit limit of indemnity: £50,000 any one vehicle.
Cover includes customers' motor vehicles being carried or transported.`

describe('goods in transit verification',()=>{
  it('approves explicit active GIT cover for transported customer vehicles',()=>expect(check(valid).status).toBe('APPROVED'))
  it('rejects a motor policy that does not explicitly provide GIT cover',()=>expect(check(valid.replace('Goods in Transit Insurance Policy','Motor Trade Road Risks Insurance').replace('Goods in Transit limit of indemnity','Customer vehicle indemnity limit')).status).toBe('REJECTED'))
  it('rejects an exclusion for transported motor vehicles',()=>expect(check(`${valid}\nMotor vehicles are not covered.`).status).toBe('REJECTED'))
  it('rejects explicit GIT cover below £50,000',()=>{
    const result=check(valid.replace('£50,000','£49,999'))
    expect(result.status).toBe('REJECTED')
    expect(result.rules.find(rule=>rule.ruleId==='indemnity-limit')?.reason).toContain('below the required minimum')
  })
  it('does not treat an unrelated customer-vehicle limit as a GIT limit',()=>{
    const result=check(valid.replace('Goods in Transit limit of indemnity: £50,000 any one vehicle.','Customer vehicle indemnity limit: £75,000.'))
    expect(result.rules.find(rule=>rule.ruleId==='indemnity-limit')?.passed).toBe(false)
  })
  it('does not treat an unrelated demonstration-cover exclusion as a GIT exclusion',()=>{
    const result=check(`${valid}\nDemonstration Cover EXCLUDED. In respect of vehicles used for demonstration, special terms apply.`)
    expect(result.rules.find(rule=>rule.ruleId==='git-exclusions')?.passed).toBe(true)
  })
  it('returns the exact conflicting GIT exclusion as evidence',()=>{
    const result=check(`${valid}\nCustomers' motor vehicles are not covered.`)
    const exclusion=result.rules.find(rule=>rule.ruleId==='git-exclusions')
    expect(exclusion).toMatchObject({passed:false,page:1})
    expect(exclusion?.evidence).toContain('motor vehicles are not covered')
  })
})
