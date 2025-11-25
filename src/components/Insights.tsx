import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, AlertTriangle, CheckCircle, Eye, Target, TrendingUp } from 'lucide-react';

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

const DAYS_OF_WEEK = [
  { key: 'monday' as DayKey, label: 'Monday', short: 'Mon' },
  { key: 'tuesday' as DayKey, label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday' as DayKey, label: 'Wednesday', short: 'Wed' },
  { key: 'thursday' as DayKey, label: 'Thursday', short: 'Thu' },
  { key: 'friday' as DayKey, label: 'Friday', short: 'Fri' },
  { key: 'saturday' as DayKey, label: 'Saturday', short: 'Sat' },
  { key: 'sunday' as DayKey, label: 'Sunday', short: 'Sun' },
];

const INSIGHTS_DATA: Record<DayKey, any> = {
  monday: {
    title: '📊 Monday',
    alerts: [
      {
        id: 1,
        title: 'The "Bandra PowerCycle" Overload',
        type: 'critical',
        observation: 'You have scheduled 4 PowerCycle classes at Bandra (8:30, 10:00, 18:00, 19:30).',
        risk: 'PowerCycle is a high-intensity, equipment-dependent niche. Scheduling it every 90 minutes in the morning (8:30 & 10:00) risks cannibalizing your audience.',
        problem: 'The 10:00 AM Problem: This slot is typically dominated by the "school run" demographic (mothers dropping kids off) who historically favor Barre or Mat formats over high-intensity cardio.',
        recommendation: 'Swap the 10:00 AM PowerCycle to Studio Barre 57. This diversifies the morning offering and captures a different client segment than the 8:30 AM crowd.'
      },
      {
        id: 2,
        title: 'Kwality House Evening Congestion',
        type: 'warning',
        observation: 'Five classes are scheduled between 17:45 and 19:30. 17:45 Mat Express → 18:00 FIT → 18:45 Barre → 19:15 Strength → 19:30 Cycle.',
        risk: 'The transitions at 18:45 (Barre start) and 19:15 (Strength start) are very tight. If the 18:00 FIT class runs even 5 minutes over, the lobby will be overcrowded with 18:45 attendees waiting.',
        recommendation: 'Ensure the 17:45 Express class ends strictly at 18:30 to allow the 18:45 crowd to check in smoothly.'
      },
      {
        id: 3,
        title: 'Trainer Load & Safety',
        type: 'warning',
        observation: 'Vivaran Dhasmana: Scheduled for 18:00 and 19:30 PowerCycle (Bandra). Teaching two cycle classes with only a 45-minute active recovery break is physically grueling.',
        risk: 'Performance/energy in the 19:30 class may dip.',
        recommendation: 'Monitor trainer wellness or consider swapping one session to a different trainer.'
      }
    ],
    schedule: [
      { time: '07:15', location: 'Kwality House', class: 'Strength Lab', trainer: 'Anisha Shah', status: 'monitor', statusColor: 'bg-yellow-500', recommendation: 'Strength Lab is niche for 7am. If avg < 10, switch to Barre 57.' },
      { time: '07:30', location: 'Kwality House', class: 'PowerCycle', trainer: 'Mrigakshi', status: 'revise', statusColor: 'bg-red-500', recommendation: '7:30 AM Cycle is hard to fill at KH. Suggest Cardio Barre.' },
      { time: '07:30', location: 'Bandra', class: 'Mat 57', trainer: 'Reshma', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Anchor Class. Reshma + Mat is a winning combo.' },
      { time: '08:30', location: 'Kwality House', class: 'Mat 57', trainer: 'Anisha Shah', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Anchor Class. High retention expected.' },
      { time: '10:00', location: 'Bandra', class: 'PowerCycle', trainer: 'Bret Saldanha', status: 'revise', statusColor: 'bg-red-500', recommendation: 'Cannibalization Risk. Change to Barre 57 or Sculpt.' },
      { time: '18:00', location: 'Kwality House', class: 'Studio FIT', trainer: 'Atulan', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Highlight Class. Atulan\'s energy fits the FIT format perfectly here.' },
      { time: '19:30', location: 'Bandra', class: 'PowerCycle', trainer: 'Vivaran', status: 'monitor', statusColor: 'bg-yellow-500', recommendation: 'Second evening cycle class. Monitor fill rate closely vs. the 18:00.' }
    ],
    optimization: {
      title: 'The "Monday Morning Mix" Fix',
      current: 'Mat → Cycle → Cardio → Cycle',
      proposed: [
        '07:30 Mat 57 (Reshma) - Wakes up the body',
        '08:30 PowerCycle (Bret) - High energy peak', 
        '09:00 Cardio Barre (Reshma) - Endurance',
        '10:00 Sculpt / Barre (New) - Toning focus (replaces Cycle)'
      ],
      benefit: 'This sequence ensures that a client could potentially double up (e.g., Cycle + Sculpt) without dying of exhaustion (Cycle + Cycle).'
    }
  },
  tuesday: {
    title: '📊 Tuesday',
    alerts: [
      {
        id: 1,
        title: 'Critical Late Morning Revenue Leakage',
        type: 'critical',
        observation: 'The 11:00 AM hour at both locations shows critical failure. KH Studio Mat 57 (Simonelle) and SHQ Studio Back Body Blaze (Mrigakshi) both have historically low attendance.',
        risk: 'Two simultaneous failing classes create significant revenue drain and resource waste during prime operational hours.',
        problem: 'Placing low-impact Mat and high-intensity Back Body Blaze in dead-zone slots has not resonated with client demand patterns.',
        recommendation: 'Replace both 11:00 AM classes - KH with Studio FIT Express (40 min) assigned to Pranjali, SHQ with Beginner/Foundations Barre 57 assigned to Reshma.'
      },
      {
        id: 2,
        title: 'Bandra Early Morning Format Vulnerability',
        type: 'warning',
        observation: '7:15 AM Studio Barre 57 with Karan consistently underperforms with high booking-to-cancellation rate.',
        risk: 'Low conversion from bookings to check-ins indicates lack of motivational pull and affects trainer morale and studio efficiency.',
        recommendation: 'Change format from Studio Barre 57 to Studio FIT Express (40 min) to increase perceived value and reduce no-shows.'
      },
      {
        id: 3,
        title: 'Trainer Utilization Imbalance',
        type: 'warning',
        observation: 'Karan Bhatia assigned weak 7:15 AM slot and mid-performing 10:00 AM. Simonelle assigned failing 11:00 AM Mat despite strong 8:15 PM Recovery performance.',
        risk: 'Suboptimal trainer placement reduces overall schedule performance and wastes high-performing instructor potential.',
        recommendation: 'Reassign trainers based on format strengths - elevate Pranjali to high-impact slots, keep Simonelle in specialized recovery formats.'
      }
    ],
    schedule: [
      { time: '07:15', location: 'Supreme HQ', class: 'Studio FIT Express', trainer: 'Karan Bhatia (Revised)', status: 'revise', statusColor: 'bg-orange-500', recommendation: 'Change from Barre 57 to FIT Express for higher intensity and reduced no-shows.' },
      { time: '07:30', location: 'Kwality House', class: 'PowerCycle', trainer: 'Richard', status: 'keep', statusColor: 'bg-green-500', recommendation: 'High-demand anchor class. Maintain scheduling and trainer assignment.' },
      { time: '09:15', location: 'Supreme HQ', class: 'Studio FIT', trainer: 'Pranjali', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Star performer representing best mid-morning slot usage. Keep unchanged.' },
      { time: '09:30', location: 'Kwality House', class: 'Strength Lab', trainer: 'Anisha', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Strong attendance anchor with solid track record. Maintain format and trainer.' },
      { time: '10:00', location: 'Supreme HQ', class: 'Barre 57', trainer: 'Karan Bhatia', status: 'monitor', statusColor: 'bg-yellow-500', recommendation: 'Satisfactory performance but needs enhancement. Monitor closely for improvement opportunities.' },
      { time: '11:00', location: 'Kwality House', class: 'Studio FIT Express', trainer: 'Pranjali (Reassigned)', status: 'revise', statusColor: 'bg-orange-500', recommendation: 'Replace failing Mat 57 with proven FIT Express format for time-constrained midday users.' },
      { time: '11:00', location: 'Supreme HQ', class: 'Foundations Barre 57', trainer: 'Reshma (Reassigned)', status: 'revise', statusColor: 'bg-orange-500', recommendation: 'Replace failing Back Body Blaze with beginner-focused class for new client acquisition.' },
      { time: '17:45', location: 'Kwality House', class: 'Barre 57', trainer: 'Vivaran', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Outstanding peak hour performance. Key retention tool.' },
      { time: '18:00', location: 'Supreme HQ', class: 'Studio FIT', trainer: 'Anisha', status: 'keep', statusColor: 'bg-green-500', recommendation: 'High-demand peak hour class. Maintain current setup.' },
      { time: '20:15', location: 'Kwality House', class: 'Recovery', trainer: 'Simonelle', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Robust late-night recovery option. Strong closer for post-work clients.' },
      { time: '21:00', location: 'Supreme HQ', class: 'PowerCycle Express', trainer: 'Rohan', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Strong late commuter class. Excellent final burst option.' }
    ],
    optimization: {
      title: 'Tuesday Revenue Optimization Strategy',
      current: 'Morning Success → Late Morning Failure → Evening Anchor',
      proposed: [
        '07:15 FIT Express (Bandra) - High intensity reduces no-shows',
        '11:00 Express Formats (Both) - 40-min commitment barriers reduced', 
        'Peak Evening Maintained (17:45-21:00) - Revenue anchors protected',
        'Trainer Rebalancing - Strengths matched to optimal time slots'
      ],
      benefit: 'This strategy eliminates the critical 11:00 AM revenue leakage, optimizes trainer utilization, and maintains the strong evening performance while creating new midday revenue opportunities for time-constrained clients.'
    }
  },
  wednesday: {
    title: '📊 Wednesday',
    alerts: [
      {
        id: 1,
        title: 'Kwality House Peak Hour Cannibalization',
        type: 'critical',
        observation: 'At 8:00 AM, Studio Strength Lab (Push) and Studio PowerCycle compete directly. Both high-intensity workouts targeting similar demographics.',
        risk: 'Direct competition between high-intensity formats may cannibalize audience and reduce overall fill rates.',
        problem: 'Offering two high-impact workouts simultaneously limits diversity and fails to capture different fitness goals.',
        recommendation: 'Replace one class with Mat 57 (low-impact) to provide choice between high and low intensity options.'
      },
      {
        id: 2,
        title: 'Critical Midday Revenue Void',
        type: 'critical',
        observation: 'KH has 6.5-hour gap (11:30 AM - 6:00 PM), SHQ has 7-hour gap (11:00 AM - 6:00 PM). No midday offerings at either location.',
        risk: 'Massive revenue opportunity loss during lunch break and afternoon periods when clients seek shorter workout options.',
        recommendation: 'Schedule mandatory 45-minute "Lunch Cycle" or "Express Barre" at 1:00 PM at both locations to capture midday market.'
      },
      {
        id: 3,
        title: 'Supreme HQ Trainer Overload Crisis',
        type: 'critical',
        observation: 'Reshma Sharma scheduled for three consecutive high-energy classes: Cardio Barre (7:30 AM) → Barre 57 (9:00 AM) → PowerCycle (10:30 AM) with only 15-30 minute breaks.',
        risk: 'Unsustainable trainer load will compromise class quality, energy levels, and instructor wellbeing over time.',
        recommendation: 'Move Reshma\'s 10:30 AM PowerCycle to 11:30 AM or reassign to Vivaran to provide critical one-hour recovery gap.'
      }
    ],
    schedule: [
      { time: '07:30', location: 'Kwality House', class: 'Cardio Barre', trainer: 'Anisha Shah', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Strong opener. Consider flow optimization with 8:30 AM pairing.' },
      { time: '08:00', location: 'Kwality House', class: 'Strength Lab vs PowerCycle', trainer: 'Multiple', status: 'revise', statusColor: 'bg-red-500', recommendation: 'Replace one high-intensity class with Mat 57 for diversity.' },
      { time: '09:00', location: 'Kwality House', class: 'Back Body Blaze', trainer: 'Anisha Shah', status: 'monitor', statusColor: 'bg-yellow-500', recommendation: '1.5-hour gap from previous class. Consider shifting 9:15 Barre to 8:30.' },
      { time: '11:30', location: 'Kwality House', class: 'PowerCycle', trainer: 'UNASSIGNED', status: 'revise', statusColor: 'bg-red-500', recommendation: 'Critical: Assign trainer immediately. Unassigned peak slots create operational risk.' },
      { time: '13:00', location: 'Both Locations', class: 'Express Classes (NEW)', trainer: 'TBD', status: 'revise', statusColor: 'bg-orange-500', recommendation: 'Mandatory midday revenue capture. 45-min Lunch Cycle or Express Barre.' },
      { time: '07:30', location: 'Supreme HQ', class: 'Cardio Barre', trainer: 'Reshma Sharma', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Good start but monitor consecutive class load.' },
      { time: '10:30', location: 'Supreme HQ', class: 'PowerCycle', trainer: 'Reshma (OVERLOADED)', status: 'revise', statusColor: 'bg-red-500', recommendation: 'Move to 11:30 AM or reassign to prevent trainer burnout.' },
      { time: '11:00', location: 'Supreme HQ', class: 'Studio FIT', trainer: 'Vivaran', status: 'monitor', statusColor: 'bg-yellow-500', recommendation: 'Keep equipment-light for agility. Consider low-impact alternative.' },
      { time: '18:00', location: 'Kwality House', class: 'Multiple Classes', trainer: 'Multiple', status: 'monitor', statusColor: 'bg-yellow-500', recommendation: 'Implement 10-minute staggered starts (7:55 AM and 8:05 AM).' },
      { time: '19:15', location: 'Supreme HQ', class: 'Barre 57 + Express', trainer: 'Multiple', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Well-paired evening options. Excellent client choice diversity.' }
    ],
    optimization: {
      title: 'Wednesday Optimization Framework',
      current: 'Heavy Morning + Evening → 6.5-7hr Midday Void → Peak Overlap Issues',
      proposed: [
        '13:00 Midday Express Classes - Opens new revenue window for lunch breaks',
        'Trainer Load Rebalancing - Reshma recovery gap + unassigned slot coverage',
        'Staggered Peak Starts - 10-min offsets reduce congestion and improve flow',
        'Format Diversity Pairing - High/Low intensity options at simultaneous slots'
      ],
      benefit: 'This framework eliminates the critical midday revenue void, prevents trainer burnout, optimizes client flow during peak hours, and creates strategic class pairing opportunities that increase average transaction value through consecutive bookings.'
    }
  },
  thursday: {
    title: '📊 Thursday',
    alerts: [
      {
        id: 1,
        title: 'Severe 7-Hour Revenue Void',
        type: 'critical',
        observation: 'Critical gap from 11:00 AM - 6:00 PM at both locations. Largest midday void of the week, losing lunch and afternoon revenue.',
        risk: 'The 7-hour void is more severe than Wednesday, representing the biggest lost revenue opportunity of the week during high-demand lunch and afternoon slots.',
        problem: 'Both Kwality House and Supreme HQ completely abandon midday operations, failing to capture flexible workers, lunch break clients, and afternoon fitness seekers.',
        recommendation: 'Schedule mandatory 1:00 PM "Lunch & Learn" Core Express at both locations plus 5:00 PM beginner-friendly class to bridge afternoon gap.'
      },
      {
        id: 2,
        title: 'Trainer Fatigue Risk - Anisha Shah',
        type: 'critical',
        observation: 'Supreme HQ: Anisha teaches 3 consecutive morning classes (8:00 AM PowerCycle → 9:30 AM Mat 57 → 11:00 AM Cardio Barre). Extremely taxing load.',
        risk: 'Three consecutive high-energy classes with only 1.5-hour total break represents the highest individual trainer risk across the entire Thursday schedule.',
        problem: 'PowerCycle demands extreme cardiovascular output, followed by precise Mat 57 instruction, then high-energy Cardio Barre creates unsustainable physical and mental load.',
        recommendation: 'Move Anisha\'s 11:00 AM class to 11:30 AM or swap with Karan Bhatia\'s 10:30 AM Express slot to provide full hour recovery break.'
      },
      {
        id: 3,
        title: 'Back-to-Back HIIT Risk',
        type: 'warning',
        observation: 'Anmol Sharma teaches PowerCycle at 6:00 PM and 7:15 PM. Quality may suffer in second high-intensity session.',
        risk: 'If 6:00 PM class has high attendance, instructor energy and motivation quality will decline significantly for 7:15 PM participants.',
        problem: 'PowerCycle requires peak cardiovascular performance and motivational energy. Back-to-back sessions compromise the premium experience clients expect.',
        recommendation: 'Reassign 7:15 PM PowerCycle to different trainer or replace with Studio Stretch & Mobility using Atulan Purohit for recovery-focused option.'
      }
    ],
    schedule: [
      { time: '07:30', location: 'Kwality House', class: 'Mat 57 Express', trainer: 'Cauveri Vikrant', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Smart early slot usage. Core-focused work perfect for pre-commute timing.' },
      { time: '08:00', location: 'Supreme HQ', class: 'PowerCycle', trainer: 'Anisha Shah', status: 'monitor', statusColor: 'bg-yellow-500', recommendation: 'First of three consecutive classes. Monitor energy sustainability through morning.' },
      { time: '09:00', location: 'Kwality House', class: 'Barre 57', trainer: 'Cauveri Vikrant (2nd class)', status: 'monitor', statusColor: 'bg-yellow-500', recommendation: 'Second class for Cauveri. 75-minute gap provides adequate recovery time.' },
      { time: '09:30', location: 'Supreme HQ', class: 'Mat 57', trainer: 'Anisha Shah (2nd class)', status: 'revise', statusColor: 'bg-orange-500', recommendation: 'Critical: Only 90-min break before next class. Consider extending break or trainer swap.' },
      { time: '10:15', location: 'Kwality House', class: 'Strength Lab', trainer: 'Cauveri Vikrant (3rd class)', status: 'revise', statusColor: 'bg-red-500', recommendation: 'Third consecutive high-energy class. Monitor quality control and consider load distribution.' },
      { time: '10:30', location: 'Supreme HQ', class: 'PowerCycle Express', trainer: 'Karan Bhatia', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Well-placed Express format. Captures end of morning rush effectively.' },
      { time: '11:00', location: 'Supreme HQ', class: 'Cardio Barre', trainer: 'Anisha Shah (3rd class)', status: 'revise', statusColor: 'bg-red-500', recommendation: 'CRITICAL: Move to 11:30 AM or reassign trainer. Unsustainable consecutive load.' },
      { time: '13:00', location: 'Both Locations', class: 'Lunch Express (NEW)', trainer: 'TBD', status: 'revise', statusColor: 'bg-orange-500', recommendation: 'Mandatory midday revenue capture. Target remote workers and lunch break fitness.' },
      { time: '17:00', location: 'Both Locations', class: 'Afternoon Bridge (NEW)', trainer: 'TBD', status: 'revise', statusColor: 'bg-orange-500', recommendation: 'Fill afternoon gap with beginner-friendly format to capture pre-peak audience.' },
      { time: '18:00', location: 'Kwality House', class: 'Strength Lab (Pull)', trainer: 'Vivaran Dhasmana', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Excellent counter-programming to Bandra cardio focus. Maintain strategic positioning.' },
      { time: '18:00', location: 'Supreme HQ', class: 'PowerCycle', trainer: 'Anmol Sharma', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Strong peak hour anchor. Monitor for back-to-back evening impact.' },
      { time: '18:15', location: 'Supreme HQ', class: 'Barre 57', trainer: 'Karan Bhatia', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Perfect stagger timing. Allows smooth transitions between cardio and toning.' },
      { time: '19:15', location: 'Kwality House', class: 'Barre 57', trainer: 'Cauveri Vikrant', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Solid evening closer. Good format diversity from morning strength focus.' },
      { time: '19:15', location: 'Supreme HQ', class: 'PowerCycle', trainer: 'Anmol Sharma (2nd class)', status: 'revise', statusColor: 'bg-red-500', recommendation: 'CRITICAL: Replace with recovery class or reassign trainer. Back-to-back HIIT risk.' }
    ],
    optimization: {
      title: 'Thursday Cross-Training Excellence & Midday Activation',
      current: 'Morning Variety + 7-Hour Void + Peak Hour Concentration',
      proposed: [
        'Mandatory 13:00 Lunch Express Classes - Capture biggest revenue opportunity of week',
        'Trainer Load Rebalancing - Anisha recovery gaps, Anmol evening distribution',
        'Afternoon Bridge Classes - 17:00 beginner sessions to ease peak hour congestion',
        'Cross-Training Marketing - Promote 90-minute morning combinations for enhanced revenue'
      ],
      benefit: 'This optimization eliminates the most severe midday revenue void of the week, prevents trainer burnout through sustainable load distribution, and leverages Thursday\'s excellent format variety to create cross-training opportunities that increase average client revenue per visit.'
    }
  },
  friday: {
    title: '📊 Friday',
    alerts: [
      {
        id: 1,
        title: 'The Blaze Collision (7:30 AM)',
        type: 'critical',
        observation: 'Back Body Blaze Express (KH) vs Full (SHQ) forces location-based choice rather than availability-based booking. Revenue fragmentation.',
        risk: 'Simultaneous high-intensity Back Body Blaze formats create unnecessary competition between premium locations, forcing clients to choose based on convenience rather than preference.',
        problem: 'The Express format at Kemps Corner is strategically superior for early morning commuters, but its performance is diluted by simultaneous offering in Bandra.',
        recommendation: 'Maintain KH Express format, replace SHQ 7:30 AM with Studio Barre 57 to create clear differentiation between high-intensity (KH) and moderate-intensity (SHQ) morning options.'
      },
      {
        id: 2,
        title: 'Dual FIT Dilemma (9:00 AM)',
        type: 'critical',
        observation: 'Simultaneous Studio FIT at both locations guarantees neither achieves full capacity. Most severe fragmentation instance.',
        risk: 'Studio FIT is your signature high-performance, high-yield product. Scheduling simultaneously guarantees revenue cannibalization and capacity underutilization.',
        problem: 'This represents the most severe instance of format fragmentation, where your premium product competes against itself rather than capturing different client segments.',
        recommendation: 'Eliminate simultaneous FIT: Keep KH 9:00 AM Studio FIT (historically stronger), move SHQ to 9:00 AM Studio Barre 57 Signature for clean differentiation.'
      },
      {
        id: 3,
        title: 'Evening Saturation Risk (6:00 PM Bandra)',
        type: 'warning',
        observation: 'PowerCycle + Studio Barre 57 simultaneously limits single-client engagement potential. Staggering would increase visits per client.',
        risk: 'Peak hour saturation at Supreme HQ with two high-demand formats prevents clients from attending multiple classes and reduces total weekly engagement.',
        problem: 'Current approach limits clients to single-class choice rather than creating opportunities for sequential bookings within the same evening.',
        recommendation: 'Keep 6:00 PM PowerCycle as cardio anchor, move Barre 57 to 6:45 PM to create sequential funnel: PowerCycle → shower → Barre option.'
      }
    ],
    schedule: [
      { time: '07:30', location: 'Kwality House', class: 'Back Body Blaze Express', trainer: 'Mrigakshi', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Perfect pre-commute format. Maintain as high-intensity morning anchor.' },
      { time: '07:30', location: 'Supreme HQ', class: 'Back Body Blaze → Barre 57', trainer: 'Karan Bhatia', status: 'revise', statusColor: 'bg-red-500', recommendation: 'CRITICAL: Replace with Barre 57 to eliminate Blaze collision and create format differentiation.' },
      { time: '08:00', location: 'Supreme HQ', class: 'PowerCycle', trainer: 'Anmol Sharma', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Strong cardio anchor. Maintain timing and trainer assignment.' },
      { time: '08:30', location: 'Kwality House', class: 'PowerCycle → 07:45', trainer: 'Vivaran', status: 'revise', statusColor: 'bg-orange-500', recommendation: 'Move to 7:45 AM to create 45-minute gap from SHQ class and reduce cycle congestion.' },
      { time: '09:00', location: 'Kwality House', class: 'Studio FIT', trainer: 'Mrigakshi', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Historically superior FIT performance. Maintain as premium strength anchor.' },
      { time: '09:00', location: 'Supreme HQ', class: 'FIT → Barre 57 Signature', trainer: 'Pranjali', status: 'revise', statusColor: 'bg-red-500', recommendation: 'CRITICAL: Eliminate FIT collision. Replace with signature Barre for clean format separation.' },
      { time: '09:30', location: 'Supreme HQ', class: 'Barre 57 (move to 9:00)', trainer: 'Pranjali', status: 'revise', statusColor: 'bg-orange-500', recommendation: 'Shift this class to 9:00 AM slot to replace colliding FIT format.' },
      { time: '10:15', location: 'Kwality House', class: 'Cardio Barre', trainer: 'Anisha', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Good late morning energy sustainer. Maintain current setup.' },
      { time: '10:30', location: 'Kwality House', class: 'Strength Lab', trainer: 'Atulan', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Excellent strength focus for late morning. Keep unchanged.' },
      { time: '11:00', location: 'Supreme HQ', class: 'Mat 57 → Arms & Abs Express', trainer: 'Pranjali', status: 'revise', statusColor: 'bg-orange-500', recommendation: 'Replace low-demand Mat with 30-min Arms & Abs Express for weekend prep efficiency.' },
      { time: '18:00', location: 'Kwality House', class: 'Strength Lab (Pull)', trainer: 'Vivaran', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Perfect counter-programming to Bandra cardio. Maintain strategic positioning.' },
      { time: '18:00', location: 'Supreme HQ', class: 'PowerCycle', trainer: 'Anmol', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Strong cardio anchor for evening peak. Keep as foundation.' },
      { time: '18:00', location: 'Supreme HQ', class: 'Barre 57 → 18:45', trainer: 'Reshma', status: 'revise', statusColor: 'bg-orange-500', recommendation: 'Move to 6:45 PM to create sequential PowerCycle → Barre funnel opportunity.' },
      { time: '19:15', location: 'Kwality House', class: 'PowerCycle', trainer: 'Karan', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Strong evening closer. Good variety from earlier strength focus.' },
      { time: '19:30', location: 'Supreme HQ', class: 'Studio FIT', trainer: 'Atulan', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Excellent end-of-week high-intensity option. Maintain as weekend prep class.' }
    ],
    optimization: {
      title: 'Friday Paradox Resolution: Eliminate Strategic Cannibalization',
      current: 'Morning Cannibalization + Format Fragmentation + Evening Saturation = Revenue Suppression',
      proposed: [
        'Decouple Morning Peak (7:30-9:00 AM) - Eliminate simultaneous premium format competition',
        'Format Differentiation Strategy - KH high-intensity anchor, SHQ moderate-intensity flow',
        'Sequential Evening Engagement - Stagger 6:00 PM formats for multi-class participation',
        'Weekend Prep Positioning - Arms & Abs Express + targeted body sculpt messaging'
      ],
      benefit: 'This resolution eliminates the Friday Paradox by decoupling competing premium formats, creating clear location-based value propositions, and enabling sequential client engagement patterns that increase average visits per client by 40-50% while maximizing studio capacity utilization.'
    }
  },
  saturday: {
    title: '📊 Saturday',
    alerts: [
      {
        id: 1,
        title: 'CRITICAL Travel Risk - Rohan Dahima',
        type: 'critical',
        observation: 'Rohan teaches at KH 8:00 AM then must travel to SHQ for 9:30 AM PowerCycle. Saturday morning traffic poses severe delay risk.',
        risk: 'Cross-location scheduling creates critical operational vulnerability. Travel delays could impact peak 9:30 AM PowerCycle class at Supreme HQ.',
        problem: 'Kemps Corner to Bandra travel time on Saturday morning is unpredictable and creates cascade failure risk for subsequent classes.',
        recommendation: 'MANDATORY: Reassign Rohan\'s 8:00 AM KH slot immediately. Have Rohan teach exclusively at SHQ (9:30 AM, 11:00 AM).'
      },
      {
        id: 2,
        title: 'Operational Peak Risk - Triple Simultaneous Classes',
        type: 'critical',
        observation: 'KH runs 3 simultaneous classes at 10:15 AM & 11:30 AM. Requires perfect operational execution across all studios.',
        risk: 'Triple overlap creates check-in bottlenecks, parking limitations, noise interference, and staff resource strain during peak revenue hours.',
        problem: 'High operational complexity reduces client experience quality and increases failure points during maximum capacity periods.',
        recommendation: 'Move one class from 10:15/11:30 AM triple-overlap slots to newly created 2:00 PM midday bridge slot.'
      },
      {
        id: 3,
        title: 'Trainer Consecutive Load Risk',
        type: 'warning',
        observation: 'Reshma: FIT→Barre→Strength (9:00-11:30 AM). Atulan: Barre→FIT→Barre (9:00-11:30 AM). High consecutive energy demand.',
        risk: 'Progressive intensity stacking (cardio→toning→strength) creates sustainability concerns for trainer quality and client experience.',
        problem: 'Saturday premium pricing demands peak trainer performance. Consecutive high-energy classes compromise delivery quality.',
        recommendation: 'Monitor trainer wellness closely. Consider 15-minute buffer extensions between Reshma\'s consecutive strength transitions.'
      }
    ],
    schedule: [
      { time: '08:00', location: 'Kwality House', class: 'PowerCycle → REASSIGN', trainer: 'Rohan (TRAVEL RISK)', status: 'revise', statusColor: 'bg-red-500', recommendation: 'CRITICAL: Reassign to eliminate cross-location travel risk. Use local KH trainer.' },
      { time: '09:00', location: 'Kwality House', class: 'Studio FIT', trainer: 'Reshma Sharma', status: 'monitor', statusColor: 'bg-yellow-500', recommendation: 'First of three consecutive classes. Monitor energy sustainability through peak period.' },
      { time: '09:00', location: 'Supreme HQ', class: 'Studio Barre 57', trainer: 'Atulan Purohit', status: 'monitor', statusColor: 'bg-yellow-500', recommendation: 'First of three consecutive classes. Excellent stagger timing with KH.' },
      { time: '09:30', location: 'Supreme HQ', class: 'PowerCycle', trainer: 'Rohan Dahima', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Critical peak slot. Maintain if travel risk eliminated from 8:00 AM conflict.' },
      { time: '10:15', location: 'Kwality House', class: '3 Simultaneous Classes', trainer: 'Multiple', status: 'revise', statusColor: 'bg-red-500', recommendation: 'CRITICAL: Reduce to 2 classes max. Move Mat 57 or Cardio Barre to 2:00 PM slot.' },
      { time: '10:15', location: 'Supreme HQ', class: 'Studio FIT', trainer: 'Atulan (2nd class)', status: 'monitor', statusColor: 'bg-yellow-500', recommendation: 'Good stagger from KH triple overlap. Monitor trainer load sustainability.' },
      { time: '10:30', location: 'Supreme HQ', class: 'PowerCycle', trainer: 'Rohan (2nd class)', status: 'monitor', statusColor: 'bg-yellow-500', recommendation: 'Second consecutive class. 30-min recovery adequate for PowerCycle format.' },
      { time: '11:00', location: 'Supreme HQ', class: 'PowerCycle Express', trainer: 'Rohan (3rd class)', status: 'revise', statusColor: 'bg-orange-500', recommendation: 'Third consecutive class. Consider Express format or trainer rotation.' },
      { time: '11:30', location: 'Kwality House', class: '3 Simultaneous Classes', trainer: 'Multiple', status: 'revise', statusColor: 'bg-red-500', recommendation: 'CRITICAL: Second triple overlap. Move lowest-yield class to afternoon slot.' },
      { time: '11:30', location: 'Supreme HQ', class: 'Studio Barre 57', trainer: 'Atulan (3rd class)', status: 'revise', statusColor: 'bg-orange-500', recommendation: 'Third consecutive class. Consider extending break or trainer swap.' },
      { time: '12:30', location: 'Both Locations', class: 'Recovery Classes', trainer: 'Pranjali & Karan', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Perfect post-intensity positioning. Essential cool-down after peak morning blocks.' },
      { time: '14:00', location: 'Both Locations', class: 'Saturday Skills Workshop (NEW)', trainer: 'TBD', status: 'revise', statusColor: 'bg-orange-500', recommendation: 'Bridge 4.5-hour midday void. Target beginner Mat 57 or skills development.' },
      { time: '17:00', location: 'Kwality House', class: 'PowerCycle', trainer: 'Mrigakshi', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Strong weekend evening anchor. Captures pre-Saturday night fitness crowd.' },
      { time: '17:00', location: 'Supreme HQ', class: 'PowerCycle', trainer: 'Richard', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Excellent dual-location evening coverage. Maintain current assignment.' },
      { time: '18:15', location: 'Both Locations', class: 'Cardio Barre Classes', trainer: 'Multiple', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Perfect post-PowerCycle toning option. Great sequential workout opportunity.' }
    ],
    optimization: {
      title: 'Saturday Peak Operations & Risk Mitigation',
      current: 'Triple Overlaps + Cross-Location Risk + 4.5hr Midday Void',
      proposed: [
        'Eliminate Cross-Location Travel - Rohan exclusively at SHQ for operational reliability',
        'Reduce Triple Overlaps - Move 1 class from each peak slot to 2:00 PM bridge',
        'Saturday Skills Workshops - Beginner classes to capture midday market',
        'Enhanced Recovery Promotion - Market 12:30 PM classes as essential add-ons'
      ],
      benefit: 'This optimization eliminates critical operational risks, reduces peak-hour congestion, bridges the midday revenue gap, and positions recovery classes as premium wellness add-ons, increasing both operational reliability and revenue potential.'
    }
  },
  sunday: {
    title: '📊 Sunday',
    alerts: [
      {
        id: 1,
        title: 'Morning Saturation Crisis (10:00-10:15 AM)',
        type: 'critical',
        observation: 'Simultaneous PowerCycle at both locations + Strength Lab at KH creates choice overload and format cannibalization.',
        risk: 'Three high-intensity formats within 15 minutes fragments audience and reduces individual class capacity. Strength Lab suffers most from PowerCycle competition.',
        problem: 'Choice paralysis reduces booking conversion. Clients defer decisions or choose based on convenience rather than preference, reducing overall utilization.',
        recommendation: 'Anchor formats by location: KH = Strength Lab solo, SHQ = PowerCycle solo. Move KH PowerCycle to 10:15 AM for clean 15-minute stagger.'
      },
      {
        id: 2,
        title: 'Quadruple Contention Disaster (11:30 AM)',
        type: 'critical',
        observation: 'Most inefficient block of the week: PowerCycle + Barre 57 (KH) simultaneous with Cardio Barre + PowerCycle (SHQ). Four competing classes.',
        risk: 'Massive format fragmentation ensures no class reaches optimal capacity. PowerCycle repetition by same instructor suggests earlier class underperformance.',
        problem: 'Sunday premium slots wasted through over-scheduling. Peak revenue hours become revenue-negative through operational inefficiency.',
        recommendation: 'CRITICAL: Stagger to create 3 distinct waves: 11:00 AM, 11:30 AM, 12:00 PM. Eliminate duplicate PowerCycle instructor assignments.'
      },
      {
        id: 3,
        title: 'Evening Mat Over-Indexing (5:00-5:15 PM)',
        type: 'warning',
        observation: 'Mat 57 offered nearly simultaneously at both locations (5:00 PM SHQ, 5:15 PM KH) in premium Sunday evening slots.',
        risk: 'Low-yield Mat classes occupy high-value 5:00 PM slots when clients seek final high-impact weekend workouts before Monday.',
        problem: 'Strategic opportunity cost. Prime evening slots should maximize revenue through high-intensity, high-yield formats.',
        recommendation: 'Replace both Mat slots: KH 5:00 PM → PowerCycle, SHQ 5:00 PM → Back Body Blaze for complementary high-yield evening anchors.'
      }
    ],
    schedule: [
      { time: '10:00', location: 'Kwality House', class: 'Strength Lab (Solo Anchor)', trainer: 'Mrigakshi', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Perfect sole strength offering. Remove competing PowerCycle to eliminate choice overload.' },
      { time: '10:00', location: 'Supreme HQ', class: 'PowerCycle (Solo Anchor)', trainer: 'Cauveri Vikrant', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Ideal cardio anchor for Bandra. Maintain as location-specific strength.' },
      { time: '10:15', location: 'Kwality House', class: 'PowerCycle → NEW SLOT', trainer: 'Raunak', status: 'revise', statusColor: 'bg-orange-500', recommendation: 'Move KH PowerCycle here from 10:00 AM for clean stagger with SHQ.' },
      { time: '10:15', location: 'Supreme HQ', class: 'Studio Barre 57', trainer: 'Atulan', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Excellent counter-programming to KH PowerCycle. Maintain signature sculpt positioning.' },
      { time: '11:00', location: 'Supreme HQ', class: 'Cardio Barre (MOVED)', trainer: 'Anisha', status: 'revise', statusColor: 'bg-orange-500', recommendation: 'Move from 11:30 AM to create first wave of staggered flow.' },
      { time: '11:30', location: 'Kwality House', class: 'Studio Barre 57', trainer: 'Reshma', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Perfect follow-up to morning strength focus. Clean format transition.' },
      { time: '11:30', location: 'Supreme HQ', class: 'PowerCycle → ELIMINATE', trainer: 'Cauveri (DUPLICATE)', status: 'revise', statusColor: 'bg-red-500', recommendation: 'CRITICAL: Remove duplicate instructor assignment. Creates cannibalization of 10:00 AM class.' },
      { time: '12:15', location: 'Supreme HQ', class: 'PowerCycle (MOVED)', trainer: 'Cauveri', status: 'revise', statusColor: 'bg-orange-500', recommendation: 'Move 11:30 AM PowerCycle here for late-morning brunch crowd capture.' },
      { time: '16:00', location: 'Kwality House', class: 'Studio Barre 57', trainer: 'Pranjali', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Good afternoon re-entry point. Gentle lead-in to evening intensity.' },
      { time: '17:00', location: 'Kwality House', class: 'PowerCycle → NEW FORMAT', trainer: 'Vivaran', status: 'revise', statusColor: 'bg-orange-500', recommendation: 'Replace Mat 57 with PowerCycle for high-yield evening anchor.' },
      { time: '17:00', location: 'Supreme HQ', class: 'Back Body Blaze → NEW', trainer: 'Karan', status: 'revise', statusColor: 'bg-orange-500', recommendation: 'Replace Mat 57 with body-sculpting focus. Complements KH cardio offering.' },
      { time: '18:30', location: 'Supreme HQ', class: 'PowerCycle', trainer: 'Richard', status: 'keep', statusColor: 'bg-green-500', recommendation: 'Strong Sunday closer. Final high-impact option before work week.' }
    ],
    optimization: {
      title: 'Sunday Cannibalization Elimination & Flow Creation',
      current: 'Simultaneous Format Wars + Quadruple Overlap + Low-Yield Evening Slots',
      proposed: [
        'Anchor Strategy - Solo formats by location (10:00 AM): KH=Strength, SHQ=Cardio',
        'Staggered Flow Creation - 3 distinct waves (11:00, 11:30, 12:15) eliminate overlap chaos',
        'Evening Yield Maximization - Replace Mat with PowerCycle/Back Body Blaze for premium revenue',
        'Location Specialization - Clear value propositions reduce decision paralysis'
      ],
      benefit: 'This optimization eliminates the most severe format cannibalization of the week, creates logical client flow patterns with 3 distinct booking waves, and maximizes evening revenue potential through high-yield format placement, increasing Sunday capacity utilization by 40-50%.'
    }
  }
};

const getAlertIcon = (type: string) => {
  switch (type) {
    case 'critical': return <AlertTriangle className="w-5 h-5 text-red-500" />;
    case 'warning': return <Eye className="w-5 h-5 text-amber-500" />;
    case 'info': return <TrendingUp className="w-5 h-5 text-blue-500" />;
    default: return <CheckCircle className="w-5 h-5 text-green-500" />;
  }
};

const getAlertBorderColor = (type: string) => {
  switch (type) {
    case 'critical': return 'border-red-200 bg-red-50';
    case 'warning': return 'border-amber-200 bg-amber-50';
    case 'info': return 'border-blue-200 bg-blue-50';
    default: return 'border-green-200 bg-green-50';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'keep': return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'revise': return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case 'monitor': return <Eye className="w-4 h-4 text-yellow-500" />;
    default: return <CheckCircle className="w-4 h-4 text-gray-500" />;
  }
};

export default function Insights() {
  const [selectedDay, setSelectedDay] = useState<DayKey>('monday');
  const [hoveredAlert, setHoveredAlert] = useState<number | null>(null);

  const currentData = INSIGHTS_DATA[selectedDay];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 space-y-8 relative p-6">
      {/* Floating background elements for extra visual appeal */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div
          animate={{ 
            y: [0, -20, 0],
            x: [0, 10, 0],
            rotate: [0, 5, 0]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 8, 
            ease: "easeInOut" 
          }}
          className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-2xl"
        />
        <motion.div
          animate={{ 
            y: [0, 15, 0],
            x: [0, -15, 0],
            rotate: [0, -3, 0]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 10, 
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute bottom-40 left-20 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-indigo-400/10 rounded-full blur-2xl"
        />
      </div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-white rounded-3xl border border-blue-200 shadow-2xl overflow-hidden relative"
      >
        {/* Header */}
        <div className="relative bg-white px-8 py-6 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-50" />
                <Target className="w-6 h-6 text-white relative z-10" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Strategic Class Intelligence
                </h2>
                <p className="text-slate-600 text-sm mt-1 font-medium">
                  AI-powered daily operational insights and strategic recommendations
                </p>
              </div>
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
              className="flex items-center gap-3"
            >
              <span className="text-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-full font-bold shadow-lg border border-blue-300">
                🤖 AI-Powered
              </span>
              <span className="text-xs bg-gradient-to-r from-emerald-600 to-green-600 text-white px-4 py-2 rounded-full font-bold shadow-lg border border-green-300">
                ✨ Live Analytics
              </span>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Day Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        className="bg-white rounded-3xl border border-blue-200 shadow-2xl p-8 relative overflow-hidden"
      >
        {/* Floating background elements */}
        <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-xl" />
        <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-br from-indigo-400/10 to-blue-400/10 rounded-full blur-xl" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <motion.div 
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg"
              >
                <Calendar className="w-5 h-5 text-white" />
              </motion.div>
              <h3 className="text-xl font-bold text-slate-800">
                Select Day for Strategic Analysis
              </h3>
            </div>
            <div className="text-xs text-slate-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              7 Days Available
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-4">
            {DAYS_OF_WEEK.map((day, index) => (
              <motion.button
                key={day.key}
                onClick={() => setSelectedDay(day.key)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                whileHover={{ 
                  scale: selectedDay !== day.key ? 1.05 : 1.02,
                  y: -2
                }}
                whileTap={{ scale: 0.95 }}
                className={`p-4 rounded-2xl font-medium transition-all duration-300 relative overflow-hidden shadow-lg border-2 group ${
                  selectedDay === day.key
                    ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white shadow-2xl border-blue-400 scale-105'
                    : 'bg-white text-slate-700 hover:bg-blue-50 border-blue-200 hover:shadow-xl hover:border-blue-300'
                }`}
              >
                {selectedDay === day.key && (
                  <>
                    <motion.div
                      layoutId="selectedDay"
                      className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-2xl"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl"
                      animate={{ x: [-100, 100] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    />
                  </>
                )}
                <div className="relative z-10">
                  <div className={`text-lg font-bold transition-colors ${
                    selectedDay === day.key ? 'text-white' : 'text-slate-800 group-hover:text-blue-800'
                  }`}>{day.short}</div>
                  <div className={`text-xs mt-1 transition-colors ${
                    selectedDay === day.key ? 'text-blue-200' : 'text-slate-500 group-hover:text-blue-600'
                  }`}>{day.label}</div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Insights Content */}
      <motion.div
        key={selectedDay}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* Title & Content */}
        <div className="bg-white rounded-3xl border border-blue-200 shadow-2xl overflow-hidden relative">
          {/* Animated background patterns */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500" />
          </div>
          
          <div className="relative p-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h2 className="text-4xl font-bold text-slate-800 mb-3 flex items-center gap-3">
                {currentData.title}
                <motion.span
                  animate={{ rotate: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-3xl"
                >
                  📊
                </motion.span>
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
            </motion.div>
          
            {/* Critical Strategic Alerts Section */}
            {currentData.alerts.length > 0 && (
              <div className="mb-8">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 mb-6"
                >
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-3xl filter drop-shadow-lg"
                  >
                    🚨
                  </motion.span>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-red-700 bg-clip-text text-transparent">
                    Critical Strategic Alerts
                  </h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-red-300 to-transparent" />
                </motion.div>
                <div className="grid gap-6">
                  {currentData.alerts.map((alert: any) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: alert.id * 0.15, duration: 0.5 }}
                      whileHover={{ y: -2, transition: { duration: 0.2 } }}
                      className={`border-2 rounded-3xl p-8 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden group ${getAlertBorderColor(alert.type)}`}
                    >
                      {/* Animated border gradient */}
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="flex items-start gap-4 relative z-10">
                        <motion.div
                          whileHover={{ scale: 1.2, rotate: 15 }}
                          className="flex-shrink-0 mt-1"
                        >
                          {getAlertIcon(alert.type)}
                        </motion.div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900 mb-4 text-lg">{alert.title}</h4>
                          
                          {alert.observation && (
                            <div className="mb-4 p-4 bg-white/40 rounded-2xl border border-white/30">
                              <span className="font-bold text-blue-800 text-sm uppercase tracking-wide">📋 Observation: </span>
                              <span className="text-slate-700 font-medium">{alert.observation}</span>
                            </div>
                          )}
                          
                          {alert.risk && (
                            <div className="mb-4 p-4 bg-red-50/60 rounded-2xl border border-red-200/50">
                              <span className="font-bold text-red-800 text-sm uppercase tracking-wide">⚠️ Risk: </span>
                              <span className="text-slate-700 font-medium">{alert.risk}</span>
                            </div>
                          )}
                          
                          {alert.problem && (
                            <div className="mb-4 p-4 bg-amber-50/60 rounded-2xl border border-amber-200/50">
                              <span className="font-bold text-amber-800 text-sm uppercase tracking-wide">🎯 The Problem: </span>
                              <span className="text-slate-700 font-medium">{alert.problem}</span>
                            </div>
                          )}
                          
                          <div className="p-4 bg-green-50/60 rounded-2xl border border-green-200/50">
                            <span className="font-bold text-green-800 text-sm uppercase tracking-wide">💡 Recommendation: </span>
                            <span className="text-slate-700 font-medium">{alert.recommendation}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Schedule Action Plan */}
        {currentData.schedule.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-3xl border border-white/20 shadow-2xl backdrop-blur-xl overflow-hidden relative"
          >
            {/* Header section */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 p-8 border-b border-blue-300 relative">
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <motion.span
                    animate={{ rotate: [0, 360] }}
                    transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                    className="text-3xl filter drop-shadow-lg"
                  >
                    ✅
                  </motion.span>
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      Proposed Action Plan
                    </h3>
                    <p className="text-blue-100 font-medium mt-1">Keep • Monitor • Revise strategy framework</p>
                  </div>
                </div>
                <div className="text-sm bg-blue-500 px-4 py-2 rounded-full border border-blue-400 text-white">
                  {currentData.schedule.length} Classes Analyzed
                </div>
              </div>
              <p className="text-white mt-4 font-medium bg-blue-600 p-4 rounded-2xl border border-blue-400">
                📊 Based on general format performance and schedule logic
              </p>
            </div>
            
            {/* Enhanced table */}
            <div className="p-8">
              <div className="overflow-x-auto rounded-3xl border-2 border-blue-200 shadow-2xl bg-white">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-blue-200 bg-blue-50">
                      <th className="text-left py-6 px-6 font-bold text-slate-800 text-sm uppercase tracking-wide">⏰ Time</th>
                      <th className="text-left py-6 px-6 font-bold text-slate-800 text-sm uppercase tracking-wide">📍 Location</th>
                      <th className="text-left py-6 px-6 font-bold text-slate-800 text-sm uppercase tracking-wide">🏃‍♀️ Class</th>
                      <th className="text-left py-6 px-6 font-bold text-slate-800 text-sm uppercase tracking-wide">👨‍🏫 Trainer</th>
                      <th className="text-left py-6 px-6 font-bold text-slate-800 text-sm uppercase tracking-wide">📊 Status</th>
                      <th className="text-left py-6 px-6 font-bold text-slate-800 text-sm uppercase tracking-wide">💡 Recommendation</th>
                    </tr>
                  </thead>
                <tbody>
                  {currentData.schedule.map((item: any, index: number) => (
                    <motion.tr
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ 
                        backgroundColor: "rgba(255, 255, 255, 0.8)",
                        scale: 1.01,
                        transition: { duration: 0.2 }
                      }}
                      className="border-b border-blue-100 hover:bg-blue-50 hover:shadow-lg transition-all duration-300 group"
                    >
                      <td className="py-5 px-6">
                        <div className="font-bold text-slate-800 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          {item.time}
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="font-medium text-slate-700 bg-blue-50 px-3 py-1 rounded-full text-sm border border-blue-200">
                          {item.location}
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="font-bold text-slate-800 text-base">{item.class}</div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="font-medium text-slate-700 flex items-center gap-2">
                          <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
                          {item.trainer}
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-3">
                          <motion.div whileHover={{ scale: 1.2 }}>
                            {getStatusIcon(item.status)}
                          </motion.div>
                          <motion.span 
                            whileHover={{ scale: 1.05 }}
                            className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold text-white shadow-lg border border-blue-300 ${item.statusColor}`}
                          >
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </motion.span>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="text-sm text-slate-600 font-medium bg-blue-50 p-3 rounded-xl border border-blue-200 group-hover:bg-blue-100 transition-colors">
                          {item.recommendation}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
        )}

        {/* Optimization Section */}
        {currentData.optimization && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-3xl border border-blue-200 shadow-2xl overflow-hidden relative"
          >
            {/* Header */}
            <div className="relative bg-blue-600 p-8 border-b border-blue-300">
              <div className="flex items-center gap-4">
                <motion.span
                  animate={{ 
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="text-4xl filter drop-shadow-lg"
                >
                  💡
                </motion.span>
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    {currentData.optimization.title}
                  </h3>
                  <p className="text-blue-100 mt-1 font-medium">Strategic flow optimization recommendations</p>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="relative p-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Current Flow */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="relative"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-full shadow-lg" />
                    <h4 className="text-lg font-bold text-slate-800">Current Flow Analysis</h4>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-3xl blur-sm" />
                    <p className="relative text-slate-700 text-lg font-mono bg-white rounded-3xl p-6 border-2 border-blue-200 shadow-xl font-bold">
                      {currentData.optimization.current}
                    </p>
                  </div>
                </motion.div>
                
                {/* Proposed Flow */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-lg" />
                    <h4 className="text-lg font-bold text-slate-800">Proposed Optimized Flow</h4>
                  </div>
                  <div className="space-y-3">
                    {currentData.optimization.proposed.map((step: string, index: number) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 + index * 0.1 }}
                        whileHover={{ scale: 1.02, x: 5 }}
                        className="flex items-center gap-4 p-4 rounded-3xl bg-white border-2 border-blue-200 shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all duration-300 group"
                      >
                        <motion.span 
                          whileHover={{ scale: 1.2, rotate: 360 }}
                          transition={{ duration: 0.5 }}
                          className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-xl border-2 border-blue-300"
                        >
                          {index + 1}
                        </motion.span>
                        <span className="text-slate-700 font-semibold group-hover:text-slate-800 transition-colors">{step}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
              
              {/* Benefit section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mt-8 p-8 bg-white rounded-3xl border-2 border-blue-200 shadow-xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500" />
                <div className="flex items-start gap-4">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                    className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-xl"
                  >
                    <span className="text-white text-xl font-bold">✓</span>
                  </motion.div>
                  <div>
                    <h5 className="font-bold text-slate-800 text-lg mb-2">Strategic Benefit Analysis</h5>
                    <p className="text-slate-700 font-medium text-base leading-relaxed">
                      {currentData.optimization.benefit}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}