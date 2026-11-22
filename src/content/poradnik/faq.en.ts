// Tłumaczenie poradnika (faq.json) na angielski. Kluczem jest id pytania (F01…), więc zmiana polskiego tekstu nie gubi tłumaczenia.
// Nazwy druków (ZAM, Z-3, Z-3a, ZAS-26, e-ZLA) i przepisów zostają bez zmian, tak jak w oryginale.
// Brak wpisu = pytanie pokazuje się po polsku.
import type { TlumaczeniePytania } from "./faq-typy";

export const FAQ_EN: Record<string, TlumaczeniePytania> = {
  F01: {
    pytanie: "Am I entitled to sickness benefit during pregnancy, and how much is it?",
    odpowiedz: "Yes, if you have sickness insurance and an e-ZLA (electronic sick note) with code B. The benefit is 100% of the calculation base (80% in other cases). The benefit period in pregnancy is up to 270 days. For the first 33 days of incapacity in a calendar year (14 days if the employee is 50 or over – counted from the year after the one in which they turn 50), an employee receives sick pay from the employer, and the benefit from ZUS after that. The qualifying period is usually 30 days (compulsory insurance) or 90 days (voluntary insurance).",
    kroki: [
      "Your doctor issues an e-ZLA with code B (pregnancy).",
      "The e-ZLA usually goes electronically to ZUS and to your employer – you do not need to bring it in.",
      "Check that the qualifying period has passed: 30 days (employment contract) or 90 days (voluntary insurance).",
      "Your employer pays the first 33 days (14 days after the age of 50), and the benefit is paid after that.",
      "If you run your own business, ZUS always pays.",
    ],
  },
  F02: {
    pytanie: "When might I NOT get sickness benefit in pregnancy, or get less?",
    odpowiedz: "The benefit is not payable, among other cases: when the qualifying period (30 or 90 days) has not passed; when you keep the right to pay; during unpaid leave, childcare leave, arrest or imprisonment; when you work for pay or use the sick leave for a purpose other than its intended one; and with a forged certificate. If you run a business, the benefit is not payable when you have outstanding contributions. At the insured woman's written request, code B is not entered.",
    kroki: [
      "Check that the qualifying period has passed.",
      "Do not do paid work while on sick leave.",
      "Do you run a business? Check your contribution arrears on the day the right arises.",
    ],
  },
  F03: {
    pytanie: "Am I entitled to a rehabilitation benefit during pregnancy?",
    odpowiedz: "A rehabilitation benefit is paid to insured people who have used up their sickness benefit and are still unable to work but are expected to regain their ability to work. It lasts up to 12 months. It is 90% of the sickness benefit calculation base for the first three months and 75% for the rest, and 100% when the incapacity for work falls during pregnancy. A ZUS medical examiner decides on the right to the benefit.",
    kroki: [
      "Your sickness benefit must have run out and your incapacity for work must continue.",
      "A ZUS medical examiner decides on the right to the benefit.",
      "You apply to the benefit payer: ZUS, or a contribution payer that reports more than 20 insured people.",
    ],
  },
  F04: {
    pytanie: "I lost my job during pregnancy (e.g. my company went bankrupt). What am I entitled to?",
    odpowiedz: "An employee whose employment contract expired because the employer died, or was terminated during pregnancy because of the employer's bankruptcy or liquidation, and who was not offered other employment, is entitled until the day of birth to a benefit equal to the maternity benefit. After the birth, the maternity benefit is payable if the insurance ended during pregnancy for these reasons or in breach of the law as established by a final court judgment. The right is determined and paid by a contribution payer that reports more than 20 insured people, and in other cases by ZUS.",
    kroki: [
      "Keep your documents: a medical certificate of pregnancy during your employment, and a work certificate or another document confirming that the contract expired because the employer died or was terminated because of bankruptcy or liquidation.",
      "Submit an application to the benefit payer (ZUS, or a contribution payer reporting more than 20 insured people).",
      "Payment is due within 30 days of the last circumstance being clarified.",
    ],
  },
  F05: {
    pytanie: "Can my employer dismiss me when I am pregnant or on leave?",
    odpowiedz: "During pregnancy, during maternity leave and from the day you apply for leave (maternity, leave on maternity-leave terms, supplementary, paternity or parental) until the end of the leave, the employer cannot give notice or terminate the contract. Exceptions: fault of the employee together with the consent of the company trade union organisation, and bankruptcy or liquidation of the employer. The employer also cannot make preparations to give notice or terminate the contract. Pregnancy must be confirmed by a medical certificate.",
    kroki: [
      "Get a medical certificate of pregnancy.",
      "Apply for leave – from that day the rule banning dismissal protects you.",
    ],
  },
  F06: {
    pytanie: "My fixed-term contract ends during pregnancy. What now?",
    odpowiedz: "A fixed-term employment contract, or a probation contract longer than one month, that would end after the third month of pregnancy is extended until the day of birth. This does not apply to a replacement contract.",
    kroki: [
      "Check that the pregnancy is longer than 3 months at the moment the contract was due to end.",
      "Check the type of contract – a replacement contract is not extended.",
    ],
  },
  F07: {
    pytanie: "How long are maternity leave and maternity benefit?",
    odpowiedz: "20 weeks for one child, 31 for twins, 33 for triplets, 35 for four children and 37 for five or more. You can take no more than 6 weeks before the expected date of birth and the rest after the birth. The first 14 weeks after the birth belong exclusively to the mother. If you do not take leave before the birth, the first day of leave is the day of birth. A week of leave is 7 calendar days.",
    kroki: [
      "Work out how many children are born in one birth.",
      "Decide whether you want to take up to 6 weeks before the birth (you need a medical certificate with the expected date of birth).",
      "Submit a leave application to your employer and a ZAM benefit application.",
    ],
  },
  F08: {
    pytanie: "How much money will I get – 100%, 70% or 81.5%?",
    odpowiedz: "For maternity leave, supplementary leave and paternity leave, the benefit is 100% of the calculation base. For parental leave it is 70%. If the mother applies within 21 days after the birth, she gets 81.5% of the base for the whole maternity and parental period. The part of parental leave that belongs to the other parent (9 weeks) is always paid at 70%. The calculation base is the average monthly pay over 12 months reduced by 13.71%, and for one day it is 1/30 of that amount.",
    kroki: [
      "Work out the calculation base from your earnings over 12 months (calculator).",
      "Compare the 100%/70% option with the 81.5% option in the calculator.",
      "You choose the 81.5% option with an application submitted no later than 21 days after the birth.",
    ],
  },
  F09: {
    pytanie: "What is the 81.5% option, and what if I miss the deadline?",
    odpowiedz: "It is the mother's “long application” for the benefit for the whole period of maternity and parental leave. It must be submitted no later than 21 days after the birth. If no such application is submitted by the deadline, you lose the 81.5% option – the benefit is then 100% for maternity leave and 70% for parental leave. For adoption and foster families, the deadline is 21 days from taking in the child (and applying to the court).",
    kroki: [
      "Calculate both options in the calculator.",
      "If you choose 81.5% – submit the application before 21 days after the birth have passed.",
      "After the deadline the 81.5% option is lost – the benefit is calculated at 100% and 70%.",
    ],
  },
  F10: {
    pytanie: "How is the benefit calculation base worked out?",
    odpowiedz: "For an employee: the average monthly pay for the 12 calendar months before the month of the event, after deducting contributions (13.71%). With shorter insurance – from the full months of insurance. For a full-time job, the base cannot be lower than the minimum wage reduced by 13.71%. For a person who is not an employee: the average income (contribution base) over 12 months reduced by 13.71%; in 2026 the benefit base limit is PLN 20,321.30. The base for one day is 1/30. Changing jobs or a break in insurance affects the base.",
    kroki: [
      "Prepare your earnings for the last 12 months (your employer will give them in a Z-3 certificate).",
      "A person who is not an employee: provide the contribution bases (Z-3a certificate).",
      "Enter the data into the calculator – it will show the calculation steps.",
    ],
  },
  F11: {
    pytanie: "Can the father take over part of the mother's maternity leave?",
    odpowiedz: "Yes, after the mother has used at least 14 weeks after the birth. The mother can then give up the rest of her leave and return to work, if the rest is used by an employed father who is raising the child (or an insured father who has stopped his business activity). The mother applies to her employer at least 7 days before returning to work, and the father applies for part of the leave at least 14 days before it starts.",
    kroki: [
      "The mother uses at least 14 weeks after the birth.",
      "The mother submits an application to give up the rest of her leave (at least 7 days before returning to work), with a copy of the father's application.",
      "The father submits an application for part of the leave (at least 14 days before it starts).",
      "When ZUS pays the benefit, you also need the mother's statement of the date from which the father uses the entitlements and the employer's certificate of the date the leave ended.",
    ],
  },
  F12: {
    pytanie: "Can mum and dad take parental leave at the same time, and how do we split it?",
    odpowiedz: "Both parents can take parental leave at the same time – the total cannot exceed 41 weeks (43 for two or more children; 65/67 with the “For Life” certificate). Each parent has an exclusive right to 9 weeks that cannot be transferred to the other parent. The leave can be taken in one go or in no more than 5 parts, no later than the end of the calendar year in which the child turns 6. The application is submitted to the employer at least 21 days before it starts.",
    kroki: [
      "Decide who takes how much – each of you has 9 weeks just for yourself.",
      "Decide whether you take leave at the same time or one after the other, and in how many parts (max. 5).",
      "Each of you submits an application to your own employer no later than 21 days before the start.",
      "Attach to the benefit application the statements on whether the other parent is using the leave or not.",
    ],
  },
  F13: {
    pytanie: "Can I work while on parental leave?",
    odpowiedz: "Yes, with the employer that grants the leave, for no more than half of a full-time job. Parental leave is then extended in proportion to the amount of work – up to 82 weeks (86 for two or more children; 130/134 with the “For Life” certificate). The benefit is reduced in proportion to working time. The application is submitted to the employer at least 21 days before the work starts. The employer can refuse only because of how work is organised or the kind of work, and must give the reason within 7 days.",
    kroki: [
      "Decide how much of a full-time job you want to work (half at most).",
      "Submit an application to your employer 21 days before you start work; state how you will use the extended part of the leave.",
      "The employer has 7 days to reply if it refuses.",
    ],
  },
  F14: {
    pytanie: "How does paternity leave work?",
    odpowiedz: "Up to 2 weeks, at the latest until the child turns 12 months (after adoption – 12 months from the court decision becoming final, no later than the child's 14th birthday). It can be taken in one go or in 2 parts, each at least a week long. The benefit is 100% of the base. The application is submitted at least 7 days before it starts. After the deadline the right expires.",
    kroki: [
      "Choose a date before the child turns 12 months.",
      "Submit an application to your employer at least 7 days before the start.",
      "Benefit: a ZAM application (or an application to the employer) with a short-form copy of the birth certificate and a statement that the paternity-leave benefit has not been received on another basis.",
    ],
  },
  F15: {
    pytanie: "My baby was born prematurely or has been in hospital for a long time. What am I entitled to?",
    odpowiedz: "Supplementary maternity leave – a week for each week of the child's stay in hospital: up to the 15th week after the birth if the child was born before the 28th week of pregnancy or weighed up to 1,000 g; up to the 8th week after the birth if the child was born between the 28th and 37th week of pregnancy and weighed over 1,000 g; for a birth after the 37th week – if the hospital stay lasted at least 2 consecutive days and the first of them fell between the 5th and 28th day after the birth. Stays are added together and part of a week is rounded up. The benefit is 100% of the base. The leave goes to the mother or the father directly after maternity leave and is granted in one go.",
    kroki: [
      "Get a certificate from the hospital: the period of the child's stay and the week of pregnancy or birth weight.",
      "Submit an application to your employer at least 21 days before the end of maternity leave.",
      "Attach the other parent's statement that they do not intend to use supplementary leave or the benefit for that period.",
    ],
  },
  F16: {
    pytanie: "My child has a “For Life” certificate. What changes?",
    odpowiedz: "Parental leave is longer: 65 weeks for one child and 67 for two or more (instead of 41 and 43). When combined with work, the limit is 130 and 134 weeks. The benefit for parental leave is 70% of the base. With the benefit application you attach a statement that the child has the certificate, and with the leave application a copy of the certificate. Without the certificate the extended entitlement does not apply.",
    kroki: [
      "Get the certificate under Article 4(3) of the “For Life” Act.",
      "Attach a copy of the certificate to the leave application.",
      "Attach to the benefit application a statement that the child has the certificate.",
    ],
  },
  F17: {
    pytanie: "Who pays the benefit – my employer or ZUS – and where do I apply?",
    odpowiedz: "If your contribution payer reports more than 20 people to sickness insurance (as at 30 November of the previous year), the employer determines and pays the benefit – you apply to them. In other cases ZUS pays: when the payer reports 20 people or fewer, and also to people running a non-agricultural business, clergy and people entitled for a period after the insurance ended. When ZUS pays, the employer also provides the contribution payer's certificate: Z-3 for an employee, Z-3a for a person insured on another basis. A person running a business submits a ZAM application to ZUS and does not submit a payer's certificate.",
    kroki: [
      "Check how many insured people your employer reports (more than 20 – the employer pays).",
      "Your employer has more than 20: submit the application to your employer.",
      "Your employer has 20 or fewer: a ZAM application, and the employer sends ZUS a Z-3 (employee) or Z-3a (contract of mandate).",
      "You run a business: ZAM directly to ZUS.",
    ],
  },
  F18: {
    pytanie: "What documents do I need to attach?",
    odpowiedz: "It depends on the situation. Birth of a child: a medical certificate of the expected date of birth (for the period before the birth) and a short-form copy of the birth certificate (when ZUS pays the benefit, ZUS can obtain the copy itself from the civil register). Stillbirth: a copy with a note, or a certificate of stillbirth. Supplementary leave: a hospital certificate and the other parent's statement. Parental leave: statements about the other parent. Paternity leave: a copy of the birth certificate and a statement about a benefit on another basis. A child with a “For Life” certificate: a statement about the certificate. Adoption and foster care: see the question about adoption.",
    kroki: [
      "Choose your situation in the decision tree – it will show the list of documents.",
      "Attach the documents to the ZAM application (and to the Z-3 / Z-3a certificate if ZUS pays).",
      "If ZUS cannot obtain the copy from the register, it asks you to provide it within a period of not less than 14 days.",
    ],
  },
  F19: {
    pytanie: "Which deadlines can I miss, and what happens if I do?",
    odpowiedz: "Application for 81.5%: 21 days after the birth (after the deadline you lose this option). Application for parental leave: at least 21 days before the start. Application for paternity leave: at least 7 days before. Supplementary leave: at least 21 days before the end of maternity leave. The father taking over part of the leave: 14 days before. The mother giving up part of her leave: 7 days before returning to work. A claim for maternity benefit expires 6 months after the last day of the period the benefit is payable for. Paternity leave must be used before the child turns 12 months – after that the right expires.",
    kroki: [
      "Write down the date of birth – the deadlines are counted from it.",
      "Set reminders: 21 days after the birth (81.5%), 21 days before parental leave, 7 days before paternity leave.",
      "Submit the benefit application so that it falls within 6 months of the last day of the period.",
    ],
  },
  F20: {
    pytanie: "I run a business. What should I watch out for?",
    odpowiedz: "Maternity benefit requires (voluntary) sickness insurance on the day of birth – you have to register for it. If on the day the right arises you have contribution arrears above 1% of the minimum wage, the benefit is not payable until the whole debt is repaid, and the right expires if the debt is not repaid within 6 months; payment follows within 60 days of repayment at the latest. Once the benefit starts, you are automatically deregistered from voluntary sickness insurance and must register again. ZUS always pays the benefit. The base is income, that is the declared contribution base reduced by 13.71%.",
    kroki: [
      "Check your sickness insurance and contribution debt (simulation in the app).",
      "Repay any arrears before the day the right arises if they exceed 1% of the minimum wage.",
      "Submit a ZAM application directly to ZUS (most conveniently through eZUS).",
      "After the benefit, register again for voluntary sickness insurance.",
    ],
  },
  F21: {
    pytanie: "I am not entitled to maternity benefit. Am I entitled to anything?",
    odpowiedz: "Parental benefit (świadczenie rodzicielskie): PLN 1,000 a month, with no income test, for 52 weeks for one child (65 for twins, 67 for triplets, 69 for four, 71 for five or more). It is meant for people with no right to maternity benefit (e.g. unemployed people, students, people on a contract for a specific task). It is not payable if either parent receives maternity benefit for the leave period. The application is submitted at the municipal or city office: if submitted within 3 months of the child's birth it gives the right from the month of birth, and after that deadline only from the month the application was submitted.",
    kroki: [
      "Check that neither parent receives maternity benefit for that period.",
      "Submit the application at the municipal or city office (also electronically) within 3 months of the birth.",
    ],
  },
  F22: {
    pytanie: "I changed jobs or had a break in insurance during pregnancy. How does that affect the benefit?",
    odpowiedz: "Maternity benefit requires sickness insurance to be in force on the day of birth (exceptions: birth during childcare leave, insurance ending during pregnancy because of the employer's death, bankruptcy or liquidation, or in breach of the law established by a judgment). The right to sickness benefit arises after 30 days of insurance (90 – voluntary), and earlier periods count if the break did not exceed 30 days. The calculation base with the same employer is not recalculated if the break was shorter than a calendar month, and with a break of at least a month it is set anew. Changing jobs affects the calculation base.",
    kroki: [
      "Check when the new job started and whether the break was shorter than 30 days.",
      "Make sure you will be covered by sickness insurance on the day of birth.",
      "Collect your earnings from both jobs to work out the base.",
    ],
  },
  F23: {
    pytanie: "We are adopting a child or becoming a foster family. How long is the leave and how much is the benefit?",
    odpowiedz: "Leave on maternity-leave terms: 20 weeks for one child, 31 for two, 33 for three, 35 for four, 37 for five or more – at the latest until the child turns 7 (10 if starting school is postponed) in a non-professional foster family, or 14 when the application for adoption has been filed with the court. Parental leave: 41 weeks (43 for two or more children, 65/67 with “For Life”). Benefit: 100% for leave on maternity-leave terms, 70% for parental leave, 81.5% when the application is submitted within 21 days of taking in the child. The leave application is submitted within 7 days of taking in the child, and the leave starts no later than 21 days from that date.",
    kroki: [
      "Within 7 days of taking in the child, submit a leave application to your employer.",
      "Prepare a statement of the date the child was taken in for upbringing and (adoption) a family court certificate of the date the adoption application was filed, or (foster family) a court order placing the child or an agreement with the starost and a document confirming the child's age.",
      "Submit a ZAM application (date the child was taken in for upbringing) and a ZAS-26 statement.",
      "When ZUS pays – also a Z-3 (employee) or Z-3a.",
    ],
  },
  F24: {
    pytanie: "My baby was stillborn or has died. What am I entitled to?",
    odpowiedz: "The mother is entitled to maternity benefit for 8 weeks after the birth (56 days), and for no less than 7 days from the day the child died – when the child was stillborn or died before 8 weeks of age. When the child died after 8 weeks of age, the right lasts for 7 days from the day of death. For a multiple birth, the entitlement matches the number of surviving children. The benefit is 100% of the base. A funeral benefit of PLN 7,000 is also payable.",
    kroki: [
      "Submit a maternity benefit application (ZAM); when ZUS pays – also a Z-3 or Z-3a.",
      "Attach a short-form copy of the birth certificate with a note on stillbirth or – where no certificate was drawn up – a certificate of stillbirth issued by a specialist (or a doctor in specialist training) in obstetrics and gynaecology or by a midwife.",
      "When ZUS is the payer, you do not need to provide the copy – ZUS obtains it from the civil register.",
    ],
  },
  F25: {
    pytanie: "The child's mother has died, abandoned the child or cannot look after them. What is the father entitled to?",
    odpowiedz: "The father (or another insured member of the close family) has the right to the part of maternity leave falling after the mother's death or after the child was abandoned. In case of abandonment – no earlier than after the mother has used at least 8 weeks of leave or benefit after the birth. The total leave of the mother and father cannot exceed 20/31/33/35/37 weeks. Benefit: 100% for maternity leave, 70% for parental leave. The father's application includes a statement of the date of the mother's death or the date the child was abandoned, and the attachment is a short-form copy of the birth certificate.",
    kroki: [
      "The father submits an application to his employer for part of the maternity leave with a statement of the date of death/abandonment.",
      "Attach a short-form copy of the child's birth certificate.",
      "Benefit: a short-form copy of the birth certificate, the benefit payer's certificate of the period and rate of the benefit paid to the mother, and a statement of the mother's death or the abandonment of the child.",
    ],
  },
  F26: {
    pytanie: "Where can I find support after losing a child, a miscarriage or with a premature baby?",
    odpowiedz: "Non-governmental organisations and support groups for parents in difficult situations: Fundacja Wcześniak Rodzice-Rodzicom (parents of children born before the 36th week of pregnancy), Fundacja Medycyny Prenatalnej im. Ernesta Wójcickiego (support after miscarriage and stillbirth), Fundacja Warszawskie Hospicjum dla Dzieci – Perinatal Hospice, Fundacja Panda Team im. Michałka Tarachowicza (support groups after the loss of a child), Fundacja Rodzić po Ludzku (a guide to miscarriage and stillbirth in hospital).",
    kroki: [
      "Use free psychological support or support groups.",
      "Before you contact an organisation, check its current contact details on its official website.",
    ],
  },
  F27: {
    pytanie: "How do I get a copy of my child's birth certificate?",
    odpowiedz: "A short-form copy of the birth certificate is attached to benefit and leave applications. When ZUS pays the benefit, you do not need to provide the copy – ZUS obtains it from the civil register. You can apply for a copy at the civil registry office or online (Trusted Profile, the “Get a copy of a civil status record” e-service).",
    kroki: [
      "Decide: a short-form or a full copy.",
      "Apply online through gov.pl or at the civil registry office.",
      "Does ZUS pay the benefit? Do not attach the copy – ZUS will obtain it itself.",
    ],
  },
  F28: {
    pytanie: "My leave for my first child has ended and I am pregnant again. How long is maternity leave for the second child?",
    odpowiedz: "The official guidelines have no clear rule for when another pregnancy follows directly after the previous leave. Related rules: the length of maternity leave depends on the number of children born in one birth (20 weeks for one child); maternity benefit is payable when sickness insurance is in force on the day of birth or the birth falls during childcare leave; maternity benefit is not payable for the time of childcare leave; the calculation base is not set anew if there was no break between periods of receiving benefits or the break was shorter than a calendar month; parental leave for the first child can be used no later than the end of the calendar year in which the child turns 6. In this situation, consult your ZUS branch directly.",
    kroki: [
      "Check whether your sickness insurance will be active on the planned day of birth.",
      "Check your status if you are currently on childcare leave.",
      "Ask a ZUS employee (e.g. through the PUE / eZUS portal), giving the dates of both births.",
    ],
  },
};
