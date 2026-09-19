import { describe, expect, it } from 'vitest'
import { verifyInsurance } from './insurance-verifier'
const NOW=new Date('2026-09-19T12:00:00Z')
const base=`CERTIFICATE OF MOTOR INSURANCE
Policy number: SYN-123456
Insured by: Example Mutual Insurance Ltd
Commencement date: 1 January 2026
Expiry date: 31 December 2026
Fully comprehensive cover.

Business use in connection with the motor trade: vehicle recovery business, including breakdown recovery and towing of customers' vehicles for hire and reward.`
const check=(text:string,confidence?:number)=>verifyInsurance([{page:1,text,processed:true,confidence}],NOW)
describe('insurance verification',()=>{
 it('approves an active, explicitly commercial recovery policy',()=>expect(check(base).status).toBe('APPROVED'))
 it('rejects a motor-trade certificate without recovery and hire-or-reward cover',()=>expect(check(`Certificate of Motor Insurance
Certificate Number GRPREC003 41 3 Issuing Company Ageas Insurance Limited
Effective date of the commencement of cover 00:01 On 27 th June 202 6
Date of expiry of cover Midnight On 26 th J une 202 7
For Motor Trade Use: The Policyholder and employees.
Limitations as to use: Use for Social, Domestic and Pleasure purposes. Use only for Motor Trade purposes including the carriage of goods.`).status).toBe('REJECTED'))
 it('rejects OCR text with motor-trade use but no recovery or hire-or-reward wording',()=>expect(check(`Certificate Number: EMM1LFST0003862
Eridge Underwriting Agency Ltd
Effective Time / Date: 00:00 Hrs 18/07/2026
Expiry Time / Date: 23:59 Hrs 17/07/2027
Any vehicle in the custody or control of the Policyholder for Motor Trade Purposes.
Motor Trade and Social Domestic and Pleasure purposes.`).status).toBe('REJECTED'))
 it('rejects expired and future policies',()=>{expect(check(base.replace('31 December 2026','31 August 2026')).status).toBe('REJECTED');expect(check(base.replace('1 January 2026','1 October 2026')).status).toBe('REJECTED')})
 it('supports common UK date formats',()=>expect(check(base.replace('1 January 2026','01/01/2026').replace('31 December 2026','31-12-2026')).status).toBe('APPROVED'))
 it('parses ordinal dates after time values',()=>{const result=check(base.replace('Commencement date: 1 January 2026','Effective Time / Date: 0:01 12th November 2025').replace('Expiry date: 31 December 2026','Expiry Time / Date: 23:59 11th November 2026'));expect(result.rules.find(r=>r.ruleId==='start-date')?.passed).toBe(true);expect(result.rules.find(r=>r.ruleId==='expiry-date')?.passed).toBe(true)})
 it('parses ordinal dates with abbreviated months',()=>{const result=check(base.replace('Commencement date: 1 January 2026','Effective date of the commencement of insurance for the purposes of the relevant law 21:10 GMT on 21st Jul 2026').replace('Expiry date: 31 December 2026','Date of expiry of insurance 21:10 GMT on 20th Jul 2027'));expect(result.rules.find(r=>r.ruleId==='start-date')?.passed).toBe(true);expect(result.rules.find(r=>r.ruleId==='expiry-date')?.passed).toBe(true)})
 it('parses PDF-split years and insurance certificate labels',()=>{const result=check(`Certificate No. HVNPC1541509 Haven Insurance Company Limited
Effective date of the commencement of insurance 14/04/20 26
Date of the expiry of insurance 03/04/2027
Fully comprehensive cover. Business use in connection with the motor trade: vehicle recovery business, towing customers' vehicles for hire and reward.`);expect(result.rules.find(r=>r.ruleId==='start-date')?.passed).toBe(true)})
 it('parses long AXA certificate date labels and insurer format',()=>{const result=check(`Policy Number: AXARB0032109 Certificate of Motor Insurance
Effective date of the commencement of
Insurance for the purpose of relevant law. 00:00 (hours) 07/10/2025
Date of expiry of
Insurance. 23:59 (hours) 06/10/2026
Signed on behalf of AXA Insurance UK plc (Authorised Insurers).
Fully comprehensive cover. Business use in connection with the motor trade: vehicle recovery business, towing customers' vehicles for hire and reward.`);expect(result.rules.find(r=>r.ruleId==='start-date')?.passed).toBe(true);expect(result.rules.find(r=>r.ruleId==='expiry-date')?.passed).toBe(true)})
 it('parses Tradex operative dates and PLC insurer format',()=>{const result=check(`Certificate of Motor Insurance Tradex Insurance Company PLC (Authorised Insurers)
Policy number: TX108150003902
Effective time and date of commencement for the purposes of the relevant Road Traffic Acts:
Operative date: 11:05 (24hrs) 27/04/2026 Operative until: 12:00 (24hrs) 27/04/2027
Fully comprehensive cover. Declared business: vehicle recovery business, towing customers' vehicles for hire and reward.`);expect(result.rules.find(r=>r.ruleId==='start-date')?.passed).toBe(true);expect(result.rules.find(r=>r.ruleId==='expiry-date')?.passed).toBe(true)})
 it('parses operative from and operative to schedule dates',()=>{const result=check(`Policy number: TX108110001603
Operative from: 12:00 (24hrs) 16/10/2025 Operative to: 12:00 (24hrs) 16/10/2026
Use for motor trade purposes. Accident/Breakdown Recovery. Vehicles held in trust or in the custody or control of the policyholder.`);expect(result.rules.find(r=>r.ruleId==='start-date')?.passed).toBe(true);expect(result.rules.find(r=>r.ruleId==='expiry-date')?.passed).toBe(true)})
 it('accepts recovery, motor-trade and custody wording in separate certificate sections',()=>expect(check(`Certificate of Motor Insurance Tradex Insurance Company PLC
Policy number: TX108150003902 Operative date: 27/04/2026 Operative until: 27/04/2027
Declared business: Accident/Breakdown Recovery - Local, Vehicle Collection & Delivery.
Any other motor vehicle held in trust or in the custody or control of the Policyholder for the declared motor trade business.
Limitations: Use for Motor Trade purposes. Excluding use for hire or reward.`).status).toBe('APPROVED'))
 it('detects a positive recovery percentage split across table lines',()=>{const text=`Certificate of Motor Insurance
Policy number: TABLE-12345 Insured by: Example Insurance Company Limited
Start date: 01/01/2026 Expiry date: 31/12/2026
Use for motor trade purposes. Vehicles held in trust or in the custody or control of the Policyholder.
Describe your trade or business in full:\nVehicle\nRecovery/Delivery\nYes\n10`;const result=check(text);expect(result.rules.find(r=>r.ruleId==='recovery-cover')?.passed).toBe(true);expect(result.status).toBe('APPROVED')})
 it.each([['missing expiry','Expiry date: 31 December 2026'],['missing policy number','Policy number: SYN-123456']])('rejects %s',(_,phrase)=>expect(check(base.replace(phrase,'' )).status).toBe('REJECTED'))
 it('accepts declared motor-trade recovery without a separate payment phrase',()=>expect(check(base.replace('for hire and reward','')).status).toBe('APPROVED'))
 it('rejects hire and reward without recovery wording',()=>expect(check(base.replace('vehicle recovery business, including breakdown recovery and towing of customers\' vehicles','motor trade use of customers\' vehicles')).status).toBe('REJECTED'))
 it.each(['Recovery of customers’ vehicles is excluded.','Towing for payment is not covered.','Business use is not covered.'])('rejects a directly conflicting exclusion: %s',x=>expect(check(`${base}\n${x}`).status).toBe('REJECTED'))
 it('does not treat a generic hire-or-reward exclusion as a recovery exclusion',()=>expect(check(`${base}\nUse for hire or reward is excluded.`).rules.find(r=>r.ruleId==='exclusions')?.passed).toBe(true))
 it('quotes the complete paragraph from the first exclud word',()=>{const result=check(`${base}\nMotor Trade Use: permitted. Excluding use for hire or reward, passenger carriage, racing and competitions`);expect(result.rules.find(r=>r.ruleId.startsWith('exclusions-stated-'))?.evidence).toBe('excluding use for hire or reward, passenger carriage, racing and competitions')})
 it('keeps wrapped exclusion lines and paragraph breaks in the same quotation',()=>{const result=check(`${base}\nMotor Trade Use but excluding the carriage of\n\npassengers for hire and reward, messenger services, racing and competitions.`);expect(result.rules.find(r=>r.ruleId.startsWith('exclusions-stated-'))?.evidence).toBe('excluding the carriage of passengers for hire and reward, messenger services, racing and competitions.')})
 it('keeps every sentence in a does-not-cover paragraph despite OCR punctuation',()=>{const result=check(`${base}\n8. Exclusions:\nThe insurance does not cover use for racing, pacemaking or speed &. It also does not cover the carriage of passengers for hire and reward or any motor vehicle used for that purpose.\n9. Car Transportation Cover:\nCovered vehicles are listed here.`);const evidence=result.rules.find(r=>r.ruleId.startsWith('exclusions-stated-'))?.evidence;expect(evidence).toContain('it also does not cover the carriage of passengers');expect(evidence).not.toContain('car transportation cover')})
 it('rejects social domestic and pleasure only cover',()=>expect(check(base.replace('Business use in connection with the motor trade:','Social, domestic and pleasure only:').replace('vehicle recovery business,','')).status).toBe('REJECTED'))
 it('does not let unrelated hire and reward cure personal cover',()=>expect(check(`${base.replace(/Business use[^\n]+/,'Social, domestic and pleasure only.')}\nHire and reward.`).status).toBe('REJECTED'))
 it('rejects unreadable or low confidence extraction',()=>{expect(check('blur')).toMatchObject({status:'REJECTED'});expect(check(base,40).status).toBe('REJECTED')})
 it('does not claim an undetected date is expired or not started',()=>{const result=check(base.replace('Commencement date: 1 January 2026','').replace('Expiry date: 31 December 2026',''));expect(result.rules.find(r=>r.ruleId==='started')?.passed).toBe(true);expect(result.rules.find(r=>r.ruleId==='active')?.passed).toBe(true)})
 it('rejects transportation-only cover without positive commercial recovery permission',()=>{const result=check(`Certificate of Motor Insurance Including Car Transportation Cover
Policy Number: MT12779386 Effective Time and Date for Commencement of the Insurance: 19:51 17 February 2026
Expiry Time and Date of the Insurance: 23:59 13 February 2027
Any motor vehicle in the insured's custody or control. Use for Motor Trade purposes.
This policy includes cover for the transportation of motor vehicles by road. Covered vehicles: any motor vehicle being transported by the Insured.
Exclusions: carriage of goods or passengers for hire and reward.`);expect(result.status).toBe('REJECTED');expect(result.rules.find(r=>r.ruleId==='commercial-recovery')?.passed).toBe(false)})
 it('rejects a does-not-cover clause referring to passengers and vehicles',()=>{const result=check(`${base}\nThe insurance does not cover carriage of passengers for hire and reward or securing the release of any motor vehicle seized by a public authority.`);expect(result.status).toBe('REJECTED');expect(result.rules.find(r=>r.ruleId==='exclusions')?.passed).toBe(false);expect(result.rules.find(r=>r.ruleId==='exclusions')?.evidence).toContain('does not cover')})
 it('rejects recovery wording when a does-not-cover clause mentions passengers and vehicles',()=>{const result=check(`Certificate of Motor Insurance Policy number CERT/REC/9988776655
Effective date of the commencement of insurance: 21:10 GMT on 21st Jul 2026
Date of expiry of insurance: 21:10 GMT on 20th Jul 2027
Use in connection with the business of the Policyholder as a Motor Trader, including the recovery of broken down and accident-damaged vehicles and passengers accompanying recovered vehicles.
This insurance does not cover carriage of passengers or goods for hire or reward other than passengers accompanying a recovered vehicle.`);expect(result.status).toBe('REJECTED');expect(result.rules.find(r=>r.ruleId==='exclusions')?.passed).toBe(false)})
})
