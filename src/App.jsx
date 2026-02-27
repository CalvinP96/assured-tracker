import React, { useState, useEffect, useCallback, useRef } from "react";
import { loadUsers, saveUser, deleteUser as dbDeleteUser, loadProjects, saveProjects, getSession, setSession, setSessionNav } from "./db.js";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const STAGES = [
  { id:0, label:"Intake", icon:"📥", color:"#6366f1" },
  { id:1, label:"Schedule", icon:"📅", color:"#8b5cf6" },
  { id:2, label:"Assess", icon:"🔍", color:"#a855f7" },
  { id:3, label:"Scope", icon:"📋", color:"#d946ef" },
  { id:4, label:"Approve", icon:"✅", color:"#f43f5e" },
  { id:5, label:"Install", icon:"🏗️", color:"#f97316" },
  { id:6, label:"Post-QC", icon:"📊", color:"#eab308" },
  { id:7, label:"Closeout", icon:"📦", color:"#22c55e" },
];

const ROLES = [
  { key:"admin", label:"Admin/Ops", icon:"👑", tabs:["info","scheduling","assessment","photos","scope","install","qaqc","closeout","log"] },
  { key:"scheduler", label:"Scheduler", icon:"📅", tabs:["info","scheduling","log"] },
  { key:"assessor", label:"Assessor", icon:"🔍", tabs:["info","assessment","photos","log"] },
  { key:"scope", label:"Scope/Compliance", icon:"📋", tabs:["info","scope","photos","install","qaqc","closeout","log"] },
  { key:"installer", label:"Install Crew", icon:"🏗️", tabs:["info","install","photos","closeout","log"] },
];

const TAB_META = {
  info:{label:"Info",icon:"📋"}, scheduling:{label:"Schedule",icon:"📅"},
  assessment:{label:"Assess",icon:"🔍"},
  photos:{label:"Photos",icon:"📸"}, scope:{label:"Scope",icon:"✅"},
  install:{label:"Install",icon:"🏗️"}, qaqc:{label:"QAQC",icon:"🔎"},
  closeout:{label:"Close",icon:"📦"}, log:{label:"Log",icon:"📝"},
};

const EE_MEASURES = ["Air Sealing","Duct Sealing","Attic Insulation (0-R11)","Attic Insulation (R12-19)","Basement Wall Insulation","Crawl Space Wall Insulation","Knee Wall Insulation","Floor Insulation Above Crawl","Rim Joist Insulation","Injection Foam Walls","Furnace Replacement","Boiler Replacement","Central AC Replacement","Water Heater Replacement","Furnace Tune-Up","Thermostat","Low-e Storm Windows","EC Motor","AC Cover"];
const HS_MEASURES = ["CO Detector (Hardwired)","Smoke Detector (Hardwired)","CO/Smoke Combo","Exhaust Fan","Exhaust Fan w/ Light","Exhaust Fan Vent Kit","Door Sweeps","Weather Stripping","Dryer Vent Kit","Flue Repairs","Gas Mechanical Repairs","Mold Remediation","Electrical Issues","Water/Sewage Issues","Asbestos Abatement","Building Permit","Other Repairs"];
const DOCS = ["Assessment Report","Hazardous Conditions Form","Sub-Contractor Estimates","Final Inspection Form (w/ CAZ)","Photos Complete","Final Invoice (w/ sub invoices)","Customer-Signed Scope of Work","Customer Authorization Form","CSAT Leave-Behind"];

const PHOTO_SECTIONS = {
  "Home Exterior (Pre)":[{id:"ext_front",l:"Front w/ address",p:"pre"},{id:"ext_damage",l:"Pre-existing damage",p:"pre"},{id:"ext_roof",l:"Roof condition",p:"pre"},{id:"ext_sA",l:"Side A",p:"pre"},{id:"ext_sB",l:"Side B",p:"pre"},{id:"ext_sC",l:"Side C",p:"pre"},{id:"ext_sD",l:"Side D",p:"pre"},{id:"ext_ac",l:"AC Condenser",p:"pre"},{id:"ext_ac_tag",l:"AC Condenser tag",p:"pre"},{id:"ext_vents",l:"Vent terminations",p:"pre"},{id:"ext_gutters",l:"Gutters",p:"pre"}],
  "Attic (Pre)":[{id:"att_pre",l:"Pre insulation (wide)",p:"pre"},{id:"att_bypass",l:"Major bypasses",p:"pre"},{id:"att_baffle",l:"Baffle needs",p:"pre"},{id:"att_exh",l:"Exhaust terminations",p:"pre"},{id:"att_hatch",l:"Hatch",p:"pre"},{id:"att_deck",l:"Roof decking",p:"pre"},{id:"att_dmg",l:"Pre-existing damage",p:"pre"},{id:"att_moist",l:"Moisture/mold",p:"pre"}],
  "Foundation (Pre)":[{id:"fnd_insul",l:"Insulation opps",p:"pre"},{id:"fnd_plumb",l:"Plumbing DI",p:"pre"},{id:"fnd_dmg",l:"Pre-existing damage",p:"pre"},{id:"fnd_frn",l:"FRN w/ venting",p:"pre"},{id:"fnd_hwt",l:"HWT w/ venting",p:"pre"},{id:"fnd_dryer",l:"Dryer vent/cap",p:"pre"},{id:"fnd_moist",l:"Moisture/mold",p:"pre"}],
  "CAZ (Pre)":[{id:"caz_smoke",l:"Smoke/CO detectors",p:"pre"},{id:"caz_dhw",l:"DHW flue + tag",p:"pre"},{id:"caz_furn",l:"Furnace flue + tag",p:"pre"}],
  "Blower Door (Pre)":[{id:"as_setup",l:"BD setup w/ manometer",p:"pre"},{id:"as_pre",l:"Pre CFM50 manometer",p:"pre"},{id:"as_pen",l:"Common penetrations",p:"pre"}],
  "Duct (Pre)":[{id:"ds_pre",l:"Pre-CFM manometer",p:"pre"}],
  "Home Exterior (Post)":[{id:"ext_post_front",l:"Front (post)",p:"post"},{id:"ext_post_vents",l:"Vent terminations (post)",p:"post"},{id:"ext_post_ac",l:"AC Condenser (post)",p:"post"}],
  "Attic (Post)":[{id:"att_post",l:"Post insulation (wide)",p:"post"},{id:"att_post_detail",l:"Insulation detail/depth",p:"post"},{id:"att_post_bypass",l:"Bypasses sealed",p:"post"},{id:"att_post_baffle",l:"Baffles installed",p:"post"},{id:"att_post_hatch",l:"Hatch insulated",p:"post"},{id:"att_post_dam",l:"Fire dams/can lights",p:"post"}],
  "Foundation (Post)":[{id:"fnd_post_insul",l:"Foundation insulation",p:"post"},{id:"fnd_post_rim",l:"Rim joist insulation",p:"post"},{id:"fnd_post_seal",l:"Air sealing",p:"post"}],
  "Air Seal (Post)":[{id:"as_post",l:"Post CFM50 manometer",p:"post"},{id:"as_post_pen",l:"Penetrations sealed",p:"post"},{id:"as_post_detail",l:"Air seal detail",p:"post"}],
  "Duct Seal (Post)":[{id:"ds_mastic",l:"Mastic/tape applied",p:"post"},{id:"ds_post",l:"Post-CFM manometer",p:"post"},{id:"ds_post_detail",l:"Duct seal detail",p:"post"}],
  "CAZ (Post)":[{id:"caz_post_smoke",l:"Smoke/CO detectors (post)",p:"post"},{id:"caz_post_flue",l:"Flue connections (post)",p:"post"},{id:"caz_post_vent",l:"Venting (post)",p:"post"}],
  "ASHRAE Fan (Post)":[{id:"fan_box",l:"Specs box w/ model #",p:"post"},{id:"fan_inst",l:"Fan installed",p:"post"},{id:"fan_sw",l:"Switch",p:"post"},{id:"fan_duct",l:"Fan ducting/termination",p:"post"}],
  "New Products (Post)":[{id:"np_hvac",l:"New HVAC w/ tag",p:"post"},{id:"np_furn",l:"New furnace w/ tag",p:"post"},{id:"np_wh",l:"New WH w/ tag",p:"post"},{id:"np_thermo",l:"Smart thermostat",p:"post"},{id:"np_other",l:"Other new product",p:"post"}],
  "Walls (Post)":[{id:"wall_inject",l:"Injection foam holes",p:"post"},{id:"wall_patch",l:"Patched/finished",p:"post"},{id:"wall_knee",l:"Knee wall insulation",p:"post"}],
  "Misc (Post)":[{id:"misc_post1",l:"Additional photo 1",p:"post"},{id:"misc_post2",l:"Additional photo 2",p:"post"},{id:"misc_post3",l:"Additional photo 3",p:"post"}]
};

const CAZ_ITEMS = [{k:"ambient_co",l:"Ambient CO",r:true,u:"PPM"},{k:"gas_sniff",l:"Gas Sniffing",r:false},{k:"spillage",l:"Spillage Test",r:false},{k:"worst_case",l:"Worst Case Depress.",r:true,u:"PA"},{k:"oven_co",l:"Gas Oven CO",r:true,u:"PPM"},{k:"heat_co",l:"Heating System CO",r:true,u:"PPM"},{k:"wh_co",l:"Water Heater CO",r:true,u:"PPM"},{k:"dryer",l:"Dryer Vented",r:false}];

const QAQC_SECTIONS = {
  "H&S Combustion":["ASHRAE 62.2 met?","Ambient CO within BPI?","Oven/range CO within BPI?","Heating CO within BPI?","WH CO within BPI?","Heating spillage OK?","WH spillage OK?"],
  "Documentation":["Pre/post photos uploaded?","Pre/post CAZ uploaded?","Fan flow rates uploaded?","Assessment form uploaded?","Post invoice uploaded?"],
  "H&S Misc":["Vapor barrier per BPI?","Exhaust terminations per BPI?","Equipment qty matches?","Professional install?","H&S issues addressed?","H&S issues missed?"],
  "Air Sealing":["Min 20% reduction?","Qty matches invoice?","Proper thermal boundary?","Proper materials?","Professional install?","Proper measures (can lights, fire dam)?","All opps identified?"],
  "Duct Measures":["Pre/post CFM photos?","Program materials in unconditioned?"],
  "Attic Insulation":["Meets standards?","Qty matches?","Proper materials?","Baffles per BPI?","Continuous insulation (hatch)?","Proper boundary?","All opps identified?"],
  "Foundation Insulation":["Meets standards?","Qty matches?","Location matches?","Proper materials?","Professional install?","Proper boundary?","All opps?"],
  "Wall Insulation":["Meets standards?","Qty matches?","Location matches?","Proper type?","Professional install?","Proper boundary?","All opps?"],
  "Thermostats":["All eligible changed?","Smart offered?","Programmable offered?","Correctly installed?"],
  "Customer Interview":["Courteous/respectful?","Errors addressed timely?","Clear communication?","Satisfied with install?","Satisfied with quality?","Satisfied overall?","Would recommend?","Additional comments?"]
};

const FI_SAFETY = [
  {k:"ambient_co",l:"Ambient carbon monoxide",r:true,u:"PPM"},
  {k:"gas_sniff",l:"Gas Sniffing — all exposed gas lines",yn:true},
  {k:"caz_test",l:"CAZ testing"},
  {k:"spillage",l:"Spillage Test",sub:true},
  {k:"worst_case",l:"Worst Case Depressurization",sub:true,r:true,u:"PA"},
  {k:"oven_co",l:"Gas oven CO level",r:true,u:"PPM"},
  {k:"heat_co",l:"Heating system CO level",r:true,u:"PPM"},
  {k:"wh_co",l:"Water heater CO level",r:true,u:"PPM"},
  {k:"dryer",l:"Is dryer properly vented to outside?",yn:true},
  {k:"combust_vent",l:"Are combustion appliances properly vented to the outside?",yn:true}
];
const FI_INSUL = [
  {k:"walls",l:"Walls",q:"Were walls insulated?"},
  {k:"attic",l:"Attic",q:"Was attic(s) insulated?"},
  {k:"foundation",l:"Foundation Walls (Basement/Crawlspace)",q:"Were walls insulated?"},
  {k:"rim",l:"Rim Joist",q:"Was rim joist insulated?"}
];
const FI_CONTRACTOR_CK = [
  "Upload energy audit document to the Data Collection Tool",
  "Upload invoice to the Data Collection Tool",
  "Upload final inspection form to the Data Collection Tool",
  "Upload project pictures, or link to pictures, to the Data Collection Tool"
];

// ═══════════════════════════════════════════════════════════════
// PROGRAM RULES — HES Retrofits 2026
// ═══════════════════════════════════════════════════════════════
const PROGRAM = {
  // Insulation targets
  attic: { threshold: 19, target: 49, label: "Attic insulation when existing ≤R19 → bring to R-49" },
  collar: { threshold: 19, target: 49, label: "Collar beam → R-49" },
  outerCeiling: { threshold: 19, target: 49, label: "Outer ceiling joists → R-49" },
  kneeWall: { threshold: 0, target: 20, label: "Knee wall → R-13+5 or R-20 (min R-11)" },
  extWall1: { threshold: 0, target: 13, label: "Exterior walls → dense pack when possible" },
  extWall2: { threshold: 0, target: 13, label: "Exterior walls 2nd floor → dense pack when possible" },
  fnd: { threshold: 0, target: 10, label: "Basement/crawl wall → min R-10/13" },
  rimJoist: { threshold: 0, target: 10, label: "Rim joist → min R-10" },
  floorAboveCrawl: { threshold: 0, target: 20, label: "Floor above crawl → min R-20" },
  crawlCeiling: { threshold: 0, target: 30, label: "Crawlspace ceiling → R-30" },
  // Mechanical thresholds
  furnaceMinAFUE: 95,
  boilerMinAFUE: 95,
  dhwMinEF: 0.67,
  furnaceRepairCap: 950,
  dhwRepairCap: 650,
  airSealGoal: 25, // % reduction
  airSealMinCFM50pct: 1.1, // ≥110% of sqft
  // DHW efficiency by type (fuel + system → avg efficiency %)
  dhwEff: {
    "Natural Gas|Storage Tank": 60,
    "Natural Gas|On Demand": 82,
    "Electric|Storage Tank": 95,
    "Electric|On Demand": 99,
    "Electric|Heat Pump": 300,
    "Propane|Storage Tank": 60,
    "Propane|On Demand": 82,
    "Natural Gas|Indirect": 80,
    "Electric|Indirect": 90,
  },
};

// Smart recommendation badge
function Rec({type,children}) {
  const colors = {
    rec: {bg:"rgba(34,197,94,.1)",border:"rgba(34,197,94,.3)",color:"#22c55e",icon:"✓"},
    warn: {bg:"rgba(245,158,11,.1)",border:"rgba(245,158,11,.3)",color:"#f59e0b",icon:"⚠"},
    info: {bg:"rgba(99,102,241,.1)",border:"rgba(99,102,241,.3)",color:"#818cf8",icon:"ℹ"},
    flag: {bg:"rgba(239,68,68,.1)",border:"rgba(239,68,68,.3)",color:"#ef4444",icon:"⛔"},
  };
  const c = colors[type] || colors.info;
  return <div style={{marginTop:6,padding:"6px 10px",borderRadius:6,background:c.bg,border:`1px solid ${c.border}`,fontSize:11,color:c.color,lineHeight:1.4}}>{c.icon} {children}</div>;
}

// Auto-calc R to Add based on program rules
function calcRtoAdd(section, preR) {
  const rule = PROGRAM[section];
  if (!rule) return null;
  const pre = Number(preR) || 0;
  if (pre > rule.threshold && section !== "kneeWall" && section !== "extWall1" && section !== "extWall2" && section !== "fnd") return null;
  if (section === "kneeWall" && pre >= 20) return null;
  if ((section === "extWall1" || section === "extWall2") && pre > 0) return null;
  if (section === "fnd" && pre >= 10) return null;
  return Math.max(0, rule.target - pre);
}

// Insulation section smart recommendation
function InsulRec({section, preR, addR}) {
  const rule = PROGRAM[section];
  if (!rule) return null;
  const pre = Number(preR) || 0;
  const add = Number(addR) || 0;
  const total = pre + add;
  const suggested = calcRtoAdd(section, preR);
  const recs = [];

  if (preR && suggested !== null && suggested > 0) {
    recs.push({t:"rec", m:`${rule.label}. Existing R-${pre} → add R-${suggested} to reach R-${rule.target}.`});
  }
  if (preR && suggested === null) {
    recs.push({t:"info", m:`Existing R-${pre} — above threshold. Insulation not required per program rules.`});
  }
  if (preR && addR && total < rule.target && suggested !== null) {
    recs.push({t:"warn", m:`R-${add} to add will reach R-${total}, short of R-${rule.target} target. Consider increasing to R-${suggested}.`});
  }
  if (preR && addR && total >= rule.target) {
    recs.push({t:"rec", m:`Total R-${total} meets/exceeds R-${rule.target} target. ✓`});
  }
  return recs.map((r,i) => <Rec key={i} type={r.t}>{r.m}</Rec>);
}

// Get resolved qty for a measure (override or auto-calculated)
function getResolvedQty(p,m) {
  const s = p.scope2026 || {};
  const aq = {};
  const atticAdd=Number(s.attic?.addR||0),atticPre=Number(s.attic?.preR||0);
  if(atticAdd>0&&s.attic?.sqft){if(atticPre<=11)aq["Attic Insulation (0-R11)"]=Number(s.attic.sqft);else if(atticPre<=19)aq["Attic Insulation (R12-19)"]=Number(s.attic.sqft);}
  if(Number(s.fnd?.addR||0)>0||(s.fnd?.preR!==undefined&&Number(s.fnd.preR||0)===0&&(Number(s.fnd?.aboveSqft||0)+Number(s.fnd?.belowSqft||0))>0)){const b=(Number(s.fnd?.aboveSqft||0)+Number(s.fnd?.belowSqft||0));if(b>0)aq["Basement Wall Insulation"]=b;}
  if(s.fnd?.crawlR!==undefined&&Number(s.fnd.crawlR||0)===0){const c=(Number(s.fnd?.crawlAbove||0)+Number(s.fnd?.crawlBelow||0));if(c>0)aq["Crawl Space Wall Insulation"]=c;}
  if(Number(s.kneeWall?.addR||0)>0&&s.kneeWall?.sqft)aq["Knee Wall Insulation"]=Number(s.kneeWall.sqft);
  const w1=Number(s.extWall1?.addR||0)>0&&s.extWall1?.sqft?Math.round(Number(s.extWall1.sqft)*0.84):0;
  const w2=Number(s.extWall2?.addR||0)>0&&s.extWall2?.sqft?Math.round(Number(s.extWall2.sqft)*0.86):0;
  if(w1+w2>0)aq["Injection Foam Walls"]=w1+w2;
  if(s.fnd?.bandAccess&&Number(s.fnd?.bandR||0)===0&&s.fnd?.bandLnft)aq["Rim Joist Insulation"]=Number(s.fnd.bandLnft);
  if(s.fnd?.crawlBandAccess&&Number(s.fnd?.crawlBandR||0)===0&&s.fnd?.crawlBandLnft)aq["Rim Joist Insulation"]=(aq["Rim Joist Insulation"]||0)+Number(s.fnd.crawlBandLnft);
  if(Number(s.collar?.addR||0)>0&&s.collar?.sqft)aq["Attic Insulation (R12-19)"]=(aq["Attic Insulation (R12-19)"]||0)+Number(s.collar.sqft);
  if(Number(s.outerCeiling?.addR||0)>0&&s.outerCeiling?.sqft)aq["Attic Insulation (R12-19)"]=(aq["Attic Insulation (R12-19)"]||0)+Number(s.outerCeiling.sqft);
  if(s.htg?.replaceRec)aq[s.htg?.system==="Boiler"?"Boiler Replacement":"Furnace Replacement"]=1;
  if(s.dhw?.replaceRec)aq["Water Heater Replacement"]=1;
  if(s.clg?.replaceRec)aq["Central AC Replacement"]=1;
  aq["Air Sealing"]=1;
  if(s.attic?.ductwork||s.collar?.ductwork||s.fnd?.crawlDuct)aq["Duct Sealing"]=1;
  if(s.coNeeded&&Number(s.coNeeded)>0)aq["CO Detector (Hardwired)"]=Number(s.coNeeded);
  if(s.smokeNeeded&&Number(s.smokeNeeded)>0)aq["Smoke Detector (Hardwired)"]=Number(s.smokeNeeded);
  if(s.doorSweeps&&Number(s.doorSweeps)>0)aq["Door Sweeps"]=Number(s.doorSweeps);
  
  if(s.dhw?.flueRepair)aq["Flue Repairs"]=1;
  const mq=p.measureQty||{};
  return mq[m]!==undefined?mq[m]:(aq[m]!==undefined?String(aq[m]):"");
}
function measUnit(m){if(m.includes("Insulation")&&!m.includes("Rim"))return"sqft";if(m.includes("Rim Joist"))return"lnft";if(m.includes("Foam Walls"))return"sqft";return"ea";}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const fmts = (d) => d ? new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "";
const DEFAULT_USERS = [
  { id:"u1", name:"Admin", username:"admin", pin:"1234", role:"admin" },
  { id:"u2", name:"Scheduler", username:"scheduler", pin:"1234", role:"scheduler" },
  { id:"u3", name:"Assessor", username:"assessor", pin:"1234", role:"assessor" },
  { id:"u4", name:"Scope Lead", username:"scope", pin:"1234", role:"scope" },
  { id:"u5", name:"Installer", username:"installer", pin:"1234", role:"installer" },
];

// Multi-photo helpers — backward compatible (old {d,at,by} → new [{d,at,by},...])
function getPhotos(photos, id) {
  const v = photos?.[id];
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.d) return [v]; // old single format
  return [];
}
function hasPhoto(photos, id) { return getPhotos(photos, id).length > 0; }
function photoCount(photos, id) { return getPhotos(photos, id).length; }

function blank() {
  return {
    id: uid(), created: new Date().toISOString(), customerName: "", address: "",
    phone: "", email: "", riseId: "", stId: "", utility: "",
    sqft: "", stories: "", yearBuilt: "", homeType: "", occupants: "",
    currentStage: 0, stageHistory: [{s:0,at:new Date().toISOString()}],
    assessmentDate: "", installDate: "", tuneCleanDate: "", finalInspDate: "",
    assessmentScheduled: false, installScheduled: false, scheduleNotes: "",
    audit: { interior:{}, heating:{}, cooling:{}, dhw:{}, attic:{}, foundation:{}, doors:{}, notes:"" },
    preCFM50: "", postCFM50: "", preCFM25: "", postCFM25: "", bdLoc: "", extTemp: "",
    ventReq: "", ventMethod: "", ventResult: "", fanAdj: "", cazResults: {},
    measures: [], healthSafety: [], measureQty: {}, measureUnchecked: {}, hsUnchecked: {}, measureNotes: "", scopeVariances: "",
    riseStatus: "", scopeApproved: false, scopeDate: "", scopeNotes: "",
    mechNeeded: false, mechStatus: "", mechDate: "", mechNotes: "",
    fi: { safety:{}, blowerPre:"", blowerPost:"", ductPre:"", ductPost:"", thermoInstalled:"", followupNeeded:"", followupNotes:"" },
    qaqc: { scheduled:false, date:"", inspector:"", results:{}, notes:"", passed:null },
    scope2026: {},
    finalPassed: false, customerSignoff: false, installNotes: "",
    invoiceAmt: "", paymentSubmitted: false, paymentDate: "",
    docsChecklist: {}, photos: {}, activityLog: [], internalNotes: "",
    flagged: false, flagReason: "", changeOrders: [],
  };
}

function calcStage(p) {
  // 7 Closeout — final passed + signed + payment
  if (p.finalPassed && p.customerSignoff && p.paymentSubmitted) return 7;
  // 6 Post-QC — post readings exist (work done, verifying)
  if (p.postCFM50) return 6;
  // 5 Install — install confirmed + date set
  if (p.installScheduled && p.installDate) return 5;
  // 4 Approve — RISE approved + mech sorted
  if (p.scopeApproved || p.riseStatus === "approved") {
    if (p.mechNeeded && p.mechStatus !== "approved") return 4; // waiting on mech
    return 4;
  }
  // 3 Scope — has measures or CFM50 or RISE pending
  if (p.riseStatus === "pending" || p.measures.length > 0 || p.preCFM50 || Object.keys(p.photos||{}).filter(k=>hasPhoto(p.photos,k)).length > 5) return 3;
  // 2 Assess — assessment scheduled/dated
  if (p.assessmentScheduled || p.assessmentDate) return 2;
  // 1 Schedule — has name + address
  if (p.customerName && p.address) return 1;
  // 0 Intake
  return 0;
}

function getAlerts(p) {
  const a = [];
  const cs = calcStage(p);
  if (cs > p.currentStage) a.push({ type:"advance", msg:`Ready → ${STAGES[cs].label}`, stage:cs });
  if (p.customerName && p.address && !p.assessmentScheduled && !p.assessmentDate && p.currentStage < 2) a.push({ type:"schedule", msg:"Needs assessment scheduling" });
  if (p.scopeApproved && !p.installScheduled && !p.installDate && p.currentStage < 5) a.push({ type:"schedule", msg:"Needs install scheduling" });
  if (p.riseStatus === "corrections") a.push({ type:"warn", msg:"RISE corrections requested" });
  if (p.mechNeeded && !p.mechStatus) a.push({ type:"warn", msg:"Mech replacement needs approval" });
  const pendingCO = (p.changeOrders||[]).filter(c=>c.status==="pending").length;
  if (pendingCO > 0) a.push({ type:"co", msg:`${pendingCO} change order${pendingCO>1?"s":""} pending` });
  return a;
}

// ── Print / Export Helpers ───────────────────────────────
// ── Save/Print Helper ────────────────────────────────────
function savePrint(html) {
  // Create overlay container in React app
  const overlay = document.createElement("div");
  overlay.id = "print-overlay";
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999;display:flex;flex-direction:column;background:#1e293b";

  // Toolbar
  const toolbar = document.createElement("div");
  toolbar.style.cssText = "display:flex;gap:8px;padding:8px 12px;background:#0f172a;justify-content:flex-end;align-items:center;flex-shrink:0";

  const printBtn = document.createElement("button");
  printBtn.textContent = "💾 Save as PDF / Print";
  printBtn.style.cssText = "padding:8px 16px;background:#4338ca;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;font-family:Arial,sans-serif";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕ Close";
  closeBtn.style.cssText = "padding:8px 16px;background:#64748b;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;font-family:Arial,sans-serif";

  toolbar.appendChild(printBtn);
  toolbar.appendChild(closeBtn);

  // Iframe for content
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "flex:1;border:none;background:#fff";

  overlay.appendChild(toolbar);
  overlay.appendChild(iframe);
  document.body.appendChild(overlay);

  // Detect if html is already a full document or just a fragment
  const isFullDoc = html.trim().toLowerCase().startsWith("<!doctype") || html.trim().toLowerCase().startsWith("<html");
  const printStyle = "@media print{@page{margin:0}html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact;margin:0;padding:0.4in}}";
  let finalHTML;
  if (isFullDoc) {
    // Inject print styles into existing document
    finalHTML = html.replace("</head>", "<style>" + printStyle + "</style></head>");
  } else {
    finalHTML = "<html><head><style>" + printStyle + "</style></head><body style='margin:0'>" + html + "</body></html>";
  }
  iframe.contentDocument.write(finalHTML);
  iframe.contentDocument.close();

  printBtn.addEventListener("click", () => {
    try { iframe.contentWindow.focus(); iframe.contentWindow.print(); }
    catch(e) { window.print(); }
  });
  closeBtn.addEventListener("click", () => {
    document.body.removeChild(overlay);
  });
}

function printScope(p, s) {
  var h = "";
  var htg = s.htg || {};
  var clg = s.clg || {};
  var dhw = s.dhw || {};
  var int2 = s.int || {};
  var exh = s.exh || {};
  var att = s.attic || {};
  var col = s.collar || {};
  var oCJ = s.outerCeiling || {};
  var kw = s.kneeWall || {};
  var ew1 = s.extWall1 || {};
  var ew2 = s.extWall2 || {};
  var fnd = s.fnd || {};
  var a = p.audit || {};
  var yr = new Date().getFullYear();

  function V(x) { return (x != null && x !== "") ? String(x) : "\u2014"; }
  function YN(x) { return x === true ? "Yes" : x === false ? "No" : "\u2014"; }
  function CK(x) { return x === true ? "\u2611" : x === false ? "\u2610" : "\u2014"; }
  function sec(title) { h += "<div style='margin:8px 0 4px;font-weight:bold;font-size:13px;border-bottom:2px solid #333;padding-bottom:2px'>" + title + "</div>"; }
  function row(label, val) { h += "<div style='display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid #eee;font-size:11px'><span style='color:#555'>" + label + "</span><span style='font-weight:600'>" + V(val) + "</span></div>"; }

  var afue = (htg.btuIn && htg.btuOut) ? (Number(htg.btuOut) / Number(htg.btuIn) * 100).toFixed(1) + "%" : "\u2014";

  sec("Customer Information");
  row("Customer", p.customerName); row("Address", p.address); row("RISE ID", p.riseId);
  row("Sq Ft", p.sqft); row("Volume", Number(p.sqft) ? (Number(p.sqft)*8).toLocaleString() + " ft\u00b3" : null);
  row("Stories", p.stories); row("Bedrooms", s.bedrooms); row("Year Built", p.yearBuilt);
  row("Home Age", p.yearBuilt ? (yr - Number(p.yearBuilt)) + " yrs" : null); row("Occupants", p.occupants);

  sec("Building Property Type");
  row("Style", s.style); row("Tenant Type", s.tenantType);
  row("Gutters Exist", CK(s.gutterExist)); row("Downspouts", CK(s.downspouts)); row("Gutter Repairs", CK(s.gutterRepair));
  row("Roof Condition", s.roofCondition); row("Roof Type", s.roofType); row("Roof Age", s.roofAge); row("Roof Repairs", CK(s.roofRepair));

  sec("Interior Conditions");
  row("Ceiling Condition", s.ceilingCond); row("Wall Condition", s.wallCond); row("Walls Need Insulation", s.wallsNeedInsul);

  sec("Smoke / CO / Weatherization");
  row("Smoke \u2014 present", s.smokePresent); row("Smoke \u2014 to install", s.smokeNeeded);
  row("CO \u2014 present", s.coPresent); row("CO \u2014 to install", s.coNeeded);
  row("Tenmats Needed", s.tenmats); row("Door Sweeps Needed", s.doorSweeps);

  sec("Heating System Info");
  row("Thermostat", htg.thermostat); row("Fuel Type", htg.fuel); row("System Type", htg.system); row("Flue Condition", htg.flue);
  row("Manufacturer", htg.mfg); row("Install Year", htg.year);
  row("Age", htg.year ? (yr - Number(htg.year)) + " yrs" : null); row("Condition", htg.condition);
  row("BTU Input", htg.btuIn); row("BTU Output", htg.btuOut); row("AFUE", afue); row("Draft", htg.draft);
  row("Gas Shut Off", CK(htg.gasShutoff)); row("Asbestos Pipes", CK(htg.asbestosPipes));
  row("Replacement Rec", CK(htg.replaceRec)); row("Clean & Tune", CK(htg.cleanTune || htg.cleanTuneOverride));
  if (htg.notes) row("Notes", htg.notes);

  sec("Cooling System Info");
  row("Type", clg.type); row("Manufacturer", clg.mfg); row("Install Year", clg.year);
  row("Age", clg.year ? (yr - Number(clg.year)) + " yrs" : null);
  row("SEER", clg.seer); row("Condition", clg.condition); row("BTU Size", clg.btu);
  row("Replacement Rec", CK(clg.replaceRec));
  if (clg.replaceReason) row("Reason", clg.replaceReason);

  sec("Domestic Hot Water");
  row("Fuel", dhw.fuel); row("System Type", dhw.system); row("Manufacturer", dhw.mfg);
  row("Install Year", dhw.year); row("Age", dhw.year ? (yr - Number(dhw.year)) + " yrs" : null);
  row("Condition", dhw.condition); row("Input BTU", dhw.btuIn);
  row("Insulated Pipes", CK(dhw.insulPipes)); row("Flue Repair", CK(dhw.flueRepair));
  row("Replacement Rec", CK(dhw.replaceRec)); row("Ducts Need Sealing", CK(dhw.ductsSealed));

  sec("Interior Inspection");
  row("Mold", CK(int2.mold)); row("Moisture", CK(int2.moisture)); row("Knob & Tube", CK(int2.knobTube));
  row("Electrical Issues", CK(int2.electrical)); row("Broken Glass", CK(int2.brokenGlass));
  row("Vermiculite/Asbestos", CK(int2.vermiculite)); row("Water Leaks", CK(int2.waterLeaks));
  row("Roof Leaks", CK(int2.roofLeaks));
  if (int2.waterLoc) row("Water Leak Loc", int2.waterLoc);
  if (int2.roofLoc) row("Roof Leak Loc", int2.roofLoc);
  row("Ceiling Cond", int2.ceiling); row("Wall Cond", int2.wall);
  row("Dropped Ceiling", CK(int2.droppedCeiling)); row("Drywall Repair", CK(int2.drywallRepair));
  row("Recessed Lighting", CK(int2.recessedLight)); row("CO Detector", CK(int2.coDetector));
  row("Smoke Detector", CK(int2.smokeDetector));

  sec("Door Types / Exhaust");
  row("Front \u2014 Existing", CK(s.doors && s.doors.Front)); row("Back \u2014 Existing", CK(s.doors && s.doors.Back));
  row("Basement \u2014 Existing", CK(s.doors && s.doors.Basement)); row("Attic \u2014 Existing", CK(s.doors && s.doors.Attic));
  row("Strips/Sweeps Needed", s.totalSweeps);
  row("Exhaust Fan Replace", CK(exh.fanReplace)); row("Bath Fan w/ Light", CK(exh.bathFanLight));
  row("Vent Kit", CK(exh.ventKit)); row("Term Cap", CK(exh.termCap));
  row("Dryer Vented Properly", CK(exh.dryerProper)); row("Dryer Vent Repair", CK(exh.dryerRepair));
  row("BD In", exh.bdIn); row("BD Out", exh.bdOut); row("No BD (estimated)", CK(exh.noBD));
  if (exh.notes) row("Notes", exh.notes);

  sec("Attic");
  row("Finished", CK(att.finished)); row("Unfinished", CK(att.unfinished)); row("Flat", CK(att.flat));
  row("Sq Ft", att.sqft); row("Pre-Existing R", att.preR); row("R to Add", att.addR);
  row("Total R", (att.preR || att.addR) ? "R-" + (Number(att.preR||0) + Number(att.addR||0)) : null);
  row("Recessed Qty", att.recessQty); row("Storage", att.storage);
  row("Ductwork", CK(att.ductwork)); row("Floor Boards", CK(att.floorBoards));
  row("Mold", CK(att.moldPresent)); row("Vermiculite", CK(att.vermPresent)); row("Knob & Tube", CK(att.knobTube));
  if (att.ductwork) { row("Duct Condition", att.condition); row("Ln Ft Air Seal", att.lnftAirSeal); }
  row("Existing Ventilation", att.existVent); row("Needed Ventilation", att.needVent); row("Access Location", att.accessLoc);
  if (att.notes) row("Attic Notes", att.notes);

  sec("Collar Beam");
  row("Sq Ft", col.sqft); row("Pre-Existing R", col.preR); row("R to Add", col.addR);
  row("Accessible", CK(col.accessible)); row("Cut In", CK(col.cutIn)); row("Ductwork", CK(col.ductwork));

  sec("Outer Ceiling Joists");
  row("Sq Ft", oCJ.sqft); row("Pre-Existing R", oCJ.preR); row("R to Add", oCJ.addR);
  row("Accessible", CK(oCJ.accessible)); row("Cut In", CK(oCJ.cutIn)); row("Floor Boards", CK(oCJ.floorBoards));
  row("Ductwork", CK(oCJ.ductwork));

  sec("Knee Walls");
  row("Sq Ft", kw.sqft); row("Pre-Existing R", kw.preR); row("R to Add", kw.addR);
  row("Dense Pack", YN(kw.densePack)); row("Rigid Foam", YN(kw.rigidFoam)); row("Tyvek", YN(kw.tyvek));
  row("FG Batts", YN(kw.fgBatts)); row("Wall Type", kw.wallType);

  sec("Exterior Walls \u2014 1st Floor");
  row("Sq Ft", ew1.sqft); row("Pre-Existing R", ew1.preR); row("R to Add", ew1.addR);
  row("Win/Door SqFt", ew1.sqft ? Math.round(Number(ew1.sqft) * 0.16) : null);
  row("Net Insul SqFt", ew1.sqft ? Math.round(Number(ew1.sqft) * 0.84) : null);
  row("Dense Pack", YN(ew1.densePack)); row("Cladding", ew1.cladding);
  row("Insulate From", ew1.insulFrom); row("Wall Type", ew1.wallType); row("Phenolic Foam", YN(ew1.phenolic));

  sec("Exterior Walls \u2014 2nd Floor");
  row("Sq Ft", ew2.sqft); row("Pre-Existing R", ew2.preR); row("R to Add", ew2.addR);
  row("Dense Pack", YN(ew2.densePack)); row("Cladding", ew2.cladding);

  sec("Foundation / Crawl");
  row("Type", fnd.type); row("Above Grade SqFt", fnd.aboveSqft); row("Below Grade SqFt", fnd.belowSqft);
  row("Pre-Existing R", fnd.preR); row("Insulation Type", fnd.insulType);
  row("Band Joist Access", CK(fnd.bandAccess)); row("Band LnFt", fnd.bandLnft);
  row("Band R", fnd.bandR); row("Band Insulation", fnd.bandInsul);
  row("Vented", CK(fnd.vented)); row("Vapor Barrier", YN(fnd.vaporBarrier)); row("Water Issues", YN(fnd.waterIssues));
  row("Crawl Ductwork", CK(fnd.crawlDuct)); row("Crawl Floor", fnd.crawlFloor);
  row("Crawl Above SqFt", fnd.crawlAbove); row("Crawl Below SqFt", fnd.crawlBelow);
  row("Crawl R", fnd.crawlR); row("Crawl Band Access", CK(fnd.crawlBandAccess));

  sec("Diagnostics");
  row("Pre CFM50", p.preCFM50); row("Ext Temp", s.extTemp); row("BD Location", p.bdLoc);
  if (s.diagNotes) row("Notes", s.diagNotes);

  // ASHRAE 62.2 calc
  sec("ASHRAE 62.2-2016 Ventilation");
  var baseSq = Number(p.sqft) || 0;
  var finBsmt = (fnd.type === "Finished") ? (Number(fnd.aboveSqft)||0) + (Number(fnd.belowSqft)||0) : 0;
  var sq = baseSq + finBsmt;
  var Nbr = Number(s.bedrooms) || 0;
  var Q50 = Number(p.preCFM50) || 0;
  var st = Number(p.stories) || 1;
  var H2 = st >= 2 ? 16 : st >= 1.5 ? 14 : 8;
  var wsf = 0.56;
  var ash = s.ashrae || {};
  var kCFM = Number(ash.kitchenCFM || a.kitchenFan || 0);
  var b1CFM = Number(ash.bath1CFM || a.bathFan1 || 0);
  var b2CFM = Number(ash.bath2CFM || a.bathFan2 || 0);
  var b3CFM = Number(ash.bath3CFM || a.bathFan3 || 0);
  var kWin = ash.kWin; var b1Win = ash.b1Win; var b2Win = ash.b2Win; var b3Win = ash.b3Win;
  var qi2 = Q50 > 0 ? 0.052 * Q50 * wsf * Math.pow(H2 / 8.2, 0.4) : 0;
  var qt2 = (sq > 0 && Nbr >= 0) ? 0.03 * sq + 7.5 * (Nbr + 1) : 0;
  var kD = kCFM > 0 ? Math.max(0, 100 - (kWin ? 20 : kCFM)) : 0;
  var b1D = b1CFM > 0 ? Math.max(0, 50 - (b1Win ? 20 : b1CFM)) : 0;
  var b2D = b2CFM > 0 ? Math.max(0, 50 - (b2Win ? 20 : b2CFM)) : 0;
  var b3D = b3CFM > 0 ? Math.max(0, 50 - (b3Win ? 20 : b3CFM)) : 0;
  var totalDef = kD + b1D + b2D + b3D;
  var supp = totalDef * 0.25;
  var qf = qt2 + supp - qi2;
  var RND = function(x) { return Math.round(x * 100) / 100; };
  var fanSet = Number(ash.fanSetting) || 0;
  var minHr = fanSet > 0 ? RND(qf / fanSet * 60) : 0;

  row("Floor Area", sq + " ft\u00b2" + (finBsmt > 0 ? " (incl fin bsmt)" : ""));
  row("Nbr (bedrooms)", Nbr);
  row("Occupants (Nbr + 1)", Nbr + 1);
  row("Height", H2 + " ft"); row("Leakage @50Pa", Q50 + " CFM");
  row("Kitchen Fan", kCFM > 0 ? kCFM + " CFM" + (kWin ? " (window)" : "") : null);
  row("Bath #1", b1CFM > 0 ? b1CFM + " CFM" + (b1Win ? " (window)" : "") : null);
  row("Bath #2", b2CFM > 0 ? b2CFM + " CFM" + (b2Win ? " (window)" : "") : null);
  row("Bath #3", b3CFM > 0 ? b3CFM + " CFM" + (b3Win ? " (window)" : "") : null);
  row("Total Deficit (intermittent)", Math.round(totalDef) + " CFM");
  h += "<div style='margin:6px 0;padding:6px;background:#f0f0ff;border:1px solid #c7d2fe;border-radius:4px;font-size:11px'>";
  h += "<div style='font-weight:700;color:#4338ca;margin-bottom:4px'>Ventilation Results</div>";
  row("Infiltration Credit (Qinf)", RND(qi2) + " CFM");
  row("Qtot (0.03\u00d7" + sq + " + 7.5\u00d7(" + Nbr + "+1))", RND(qt2) + " CFM");
  row("Supplement (" + Math.round(totalDef) + "\u00d70.25)", RND(supp) + " CFM");
  h += "<div style='border-top:2px solid #4338ca;padding-top:4px;margin-top:4px;display:flex;justify-content:space-between'>";
  h += "<span style='font-weight:700'>Qfan = " + RND(qt2) + " + " + RND(supp) + " \u2212 " + RND(qi2) + "</span>";
  h += "<span style='font-weight:700;color:#4338ca;font-size:14px'>" + RND(qf) + " CFM</span></div>";
  if (fanSet > 0) row("Fan: " + fanSet + " CFM", "Run-time: " + minHr + " min/hr");
  h += "</div>";

  // Measures
  sec("Measures \u2014 Energy Efficiency (" + (p.measures || []).length + ")");
  (p.measures || []).forEach(function(m) {
    row(m, (getResolvedQty(p, m) || "\u2014") + " " + measUnit(m));
  });
  if (!(p.measures || []).length) h += "<div style='color:#999;font-size:11px;padding:4px 0'>None selected</div>";

  sec("Measures \u2014 Health & Safety (" + (p.healthSafety || []).length + ")");
  (p.healthSafety || []).forEach(function(m) {
    row(m, (getResolvedQty(p, m) || "\u2014") + " ea");
  });
  if (!(p.healthSafety || []).length) h += "<div style='color:#999;font-size:11px;padding:4px 0'>None selected</div>";

  sec("Notes");
  row("Work Notes", p.measureNotes);
  row("H&S Notes", s.hsNotes);

  // Build final document
  var css = "@page{margin:.3in} *{box-sizing:border-box} body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:12px;color:#000;background:#fff}";
  var title = "2026 HEA / IE Retrofit Form";
  var sub = (p.customerName || "") + " \u00b7 " + (p.address || "") + " \u00b7 RISE: " + (p.riseId || "\u2014") + " \u00b7 " + new Date().toLocaleDateString();
  var doc = "<html><head><style>" + css + "</style></head><body>";
  doc += "<div style='font-size:16px;font-weight:bold;border-bottom:2px solid #333;padding-bottom:6px;margin-bottom:4px'>" + title + "</div>";
  doc += "<div style='font-size:11px;color:#666;margin-bottom:10px'>" + sub + "</div>";
  doc += h;
  doc += "</body></html>";

  savePrint(doc);
}

function photoPageHTML(title, photos, items, p) {
  const rows = items.filter(i => hasPhoto(photos,i.id)).map(i => {
    return getPhotos(photos, i.id).map((ph,idx) => `<div style="break-inside:avoid;margin-bottom:12px;border:1px solid #ddd;border-radius:6px;overflow:hidden">
      <div style="padding:6px 10px;background:#f5f5f5;font-size:12px;font-weight:600">${i.l}${idx>0?" ("+(idx+1)+")":""} <span style="font-weight:400;color:#888">(${i.cat})</span></div>
      <img src="${ph.d}" style="width:100%;max-height:500px;object-fit:contain;display:block"/>
      <div style="padding:4px 10px;font-size:10px;color:#999">${ph.by||""} · ${ph.at?new Date(ph.at).toLocaleString():""}</div>
    </div>`).join("");
  }).join("");
  return `<!DOCTYPE html><html><head><title>${title}</title><style>@page{margin:.4in}body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:16px}h1{font-size:18px;border-bottom:2px solid #333;padding-bottom:8px}h2{font-size:12px;color:#666;margin-bottom:16px}</style></head><body>
    <h1>${title}</h1><h2>${p.customerName} · ${p.address} · ${new Date().toLocaleDateString()}</h2>${rows}</body></html>`;
}

function sideBySideHTML(photos, allItems, p) {
  const preItems = allItems.filter(i => i.p === "pre" && hasPhoto(photos,i.id));
  const postItems = allItems.filter(i => i.p === "post" && hasPhoto(photos,i.id));
  const pairs = [];
  const usedPost = new Set();
  preItems.forEach(pre => {
    const catBase = pre.cat.replace(/ \(Pre\)| \(Post\)/g,"");
    const post = postItems.find(po => !usedPost.has(po.id) && po.cat.replace(/ \(Pre\)| \(Post\)/g,"") === catBase);
    if (post) usedPost.add(post.id);
    pairs.push({ pre, post: post || null });
  });
  postItems.filter(po => !usedPost.has(po.id)).forEach(po => pairs.push({ pre: null, post: po }));
  const rows = pairs.map(({pre,post}) => {
    const preArr = pre ? getPhotos(photos, pre.id) : [];
    const postArr = post ? getPhotos(photos, post.id) : [];
    const preImg = preArr.length ? preArr.map(ph=>`<img src="${ph.d}" style="width:100%;max-height:300px;object-fit:contain;margin-bottom:2px"/>`).join("") : `<div style="height:150px;display:flex;align-items:center;justify-content:center;color:#ccc;background:#f9f9f9">No photo</div>`;
    const postImg = postArr.length ? postArr.map(ph=>`<img src="${ph.d}" style="width:100%;max-height:300px;object-fit:contain;margin-bottom:2px"/>`).join("") : `<div style="height:150px;display:flex;align-items:center;justify-content:center;color:#ccc;background:#f9f9f9">No photo</div>`;
    const label = (pre?.cat || post?.cat || "").replace(/ \(Pre\)| \(Post\)/g,"");
    return `<div style="break-inside:avoid;margin-bottom:14px;border:1px solid #ddd;border-radius:6px;overflow:hidden">
      <div style="padding:6px 10px;background:#f5f5f5;font-size:12px;font-weight:600">${label} — ${pre?.l||""} / ${post?.l||""}</div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed"><tr>
        <td style="width:50%;vertical-align:top;border-right:1px solid #eee;padding:4px;text-align:center"><div style="font-size:10px;font-weight:700;padding:2px;background:#e0e7ff;color:#4338ca">PRE</div>${preImg}</td>
        <td style="width:50%;vertical-align:top;padding:4px;text-align:center"><div style="font-size:10px;font-weight:700;padding:2px;background:#dcfce7;color:#166534">POST</div>${postImg}</td>
      </tr></table></div>`;
  }).join("");
  return `<!DOCTYPE html><html><head><title>Pre vs Post</title><style>@page{margin:.4in}body{font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:16px}h1{font-size:18px;border-bottom:2px solid #333;padding-bottom:8px}h2{font-size:12px;color:#666;margin-bottom:16px}</style></head><body>
    <h1>Pre / Post Photo Comparison</h1><h2>${p.customerName} · ${p.address} · ${new Date().toLocaleDateString()}</h2>${rows}</body></html>`;
}

function formPrintHTML(title, p, bodyHTML, sigData) {
  const sigBlock = sigData ? `<div style="margin-top:24px;border-top:1px solid #ccc;padding-top:12px"><p style="font-size:11px;color:#666;margin:0 0 4px">Signature:</p><img src="${sigData}" style="max-width:280px;height:70px;object-fit:contain"/><p style="font-size:10px;color:#999;margin:4px 0 0">Digitally signed in HES Tracker</p></div>` : `<div style="margin-top:30px;border-top:1px solid #ccc;padding-top:8px"><p style="font-size:11px;color:#666">Signature: _______________________________ &nbsp;&nbsp; Date: _______________</p></div>`;
  return `<!DOCTYPE html><html><head><title>${title}</title><style>@page{margin:.5in}body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:16px;font-size:12px}h1{font-size:18px;border-bottom:2px solid #333;padding-bottom:8px}h2{font-size:12px;color:#666;margin-bottom:16px}.sec{margin-bottom:12px;border:1px solid #ddd;border-radius:6px;padding:10px}.sec h3{font-size:13px;margin:0 0 6px;border-bottom:1px solid #eee;padding-bottom:4px}.row{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #f5f5f5}.lbl{color:#666}.val{font-weight:600}.pass{color:#16a34a;font-weight:600}.fail{color:#dc2626;font-weight:600}.na{color:#999}</style></head><body>
    <h1>${title}</h1><h2>${p.customerName} · ${p.address} · ${new Date().toLocaleDateString()}</h2>${bodyHTML}${sigBlock}</body></html>`;
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState(null); // null = loading
  const [curUser, setCurUser] = useState(null); // logged-in user object
  const [view, setView] = useState("dash");
  const [selId, setSelId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("info");
  // New project fields (lifted out of conditional to fix hooks crash)
  const [newName, setNewName] = useState("");
  const [newAddr, setNewAddr] = useState("");
  // Login fields
  const [loginUser, setLoginUser] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [loginErr, setLoginErr] = useState("");
  // User management
  const [showUsers, setShowUsers] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const tmr = useRef(null);

  const role = curUser?.role || null;
  const userName = curUser?.name || "";

  useEffect(() => {
    Promise.all([loadProjects(), loadUsers()]).then(([p, u]) => {
      if (p) setProjects(p);
      const userList = u && u.length > 0 ? u : DEFAULT_USERS;
      setUsers(userList);
      // Restore session
      const session = getSession();
      if (session?.userId) {
        const found = userList.find(x => x.id === session.userId);
        if (found) {
          setCurUser(found);
          if (session.view) setView(session.view);
          if (session.selId) setSelId(session.selId);
          if (session.tab) setTab(session.tab);
        }
      }
      setLoading(false);
    });
  }, []);

  // Persist navigation state
  useEffect(() => {
    if (curUser) setSessionNav({ view, selId, tab });
  }, [view, selId, tab, curUser]);

  const save = useCallback((p) => {
    if(tmr.current) clearTimeout(tmr.current);
    tmr.current = setTimeout(() => saveProjects(p), 400);
  }, []);

  const saveUserList = async (list) => {
    setUsers(list);
    // Sync each user to Supabase
    for (const u of list) {
      await saveUser(u);
    }
  };

  const up = fn => setProjects(prev => { const n = fn(prev); save(n); return n; });
  const upP = (id, c) => up(prev => prev.map(p => p.id === id ? {...p,...c} : p));
  const addLog = (id, txt) => up(prev => prev.map(p => p.id === id ? {...p, activityLog:[{ts:new Date().toISOString(), txt, by:userName, role},...p.activityLog]} : p));

  const checkAdvance = (id) => {
    setProjects(prev => {
      const next = prev.map(p => {
        if (p.id !== id) return p;
        const ns = calcStage(p);
        if (ns !== p.currentStage) {
          const dir = ns > p.currentStage ? "Advanced" : "Reverted";
          return {...p, currentStage:ns, stageHistory:[...p.stageHistory,{s:ns,at:new Date().toISOString()}],
            activityLog:[{ts:new Date().toISOString(),txt:`${dir} → ${STAGES[ns].label}`,by:"System"},...p.activityLog]};
        }
        return p;
      });
      save(next); return next;
    });
  };

  const upC = (id, c) => { upP(id, c); setTimeout(() => checkAdvance(id), 100); };

  const proj = projects.find(p => p.id === selId);
  const curRole = ROLES.find(r => r.key === role);

  // ── Loading ──────────────────────────────────────────────
  if (loading) return (
    <div style={S.center}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');@keyframes spin{to{transform:rotate(360deg)}}*{-webkit-tap-highlight-color:transparent;box-sizing:border-box}`}</style>
      <div style={S.spin}/>
    </div>
  );

  const globalCSS = <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');@keyframes spin{to{transform:rotate(360deg)}}*{-webkit-tap-highlight-color:transparent;box-sizing:border-box}html{color-scheme:dark}input,select,textarea,button{font-size:16px;color-scheme:dark}select option{background:#1e293b;color:#e2e8f0}@media(min-width:768px){input,select,textarea,button{font-size:inherit}}`}</style>;

  // ── Login screen ──────────────────────────────────────────
  const doLogin = () => {
    if (!users) return;
    const found = users.find(u => u.username.toLowerCase() === loginUser.trim().toLowerCase() && u.pin === loginPin);
    if (found) {
      setCurUser(found);
      setLoginErr("");
      setLoginUser("");
      setLoginPin("");
      setSession(found.id);
    } else {
      setLoginErr("Invalid username or PIN");
    }
  };

  const doLogout = () => {
    setCurUser(null);
    setView("dash");
    setSelId(null);
    setSession(null);
  };

  // ── Export Functions ──
  const exportData = () => {
    const data = JSON.stringify(projects, null, 2);
    const blob = new Blob([data], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `hes-retrofits-export-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportPhotos = async () => {
    if (typeof JSZip === "undefined") { alert("JSZip not loaded"); return; }
    const zip = new window.JSZip();
    let count = 0;
    projects.forEach(p => {
      const name = (p.customerName||"unnamed").replace(/[^a-zA-Z0-9]/g,"_");
      const folder = zip.folder(`${name}_${p.id.slice(0,6)}`);
      Object.entries(p.photos||{}).forEach(([key, val]) => {
        const arr = Array.isArray(val) ? val : (val ? [val] : []);
        arr.forEach((ph, i) => {
          const d = ph?.d || ph;
          if (!d || typeof d !== "string" || !d.startsWith("data:")) return;
          const ext = d.startsWith("data:image/png") ? "png" : d.startsWith("data:image/gif") ? "gif" : "jpg";
          const b64 = d.split(",")[1];
          if (b64) { folder.file(`${key}${arr.length>1?`_${i+1}`:""}.${ext}`, b64, {base64:true}); count++; }
        });
      });
    });
    if (count === 0) { alert("No photos to export"); return; }
    const blob = await zip.generateAsync({type:"blob"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `hes-photos-${new Date().toISOString().slice(0,10)}.zip`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportProjectPhotos = async (proj) => {
    if (typeof JSZip === "undefined") { alert("JSZip not loaded"); return; }
    const zip = new window.JSZip();
    const name = (proj.customerName||"unnamed").replace(/[^a-zA-Z0-9]/g,"_");
    let count = 0;
    Object.entries(proj.photos||{}).forEach(([key, val]) => {
      const arr = Array.isArray(val) ? val : (val ? [val] : []);
      arr.forEach((ph, i) => {
        const d = ph?.d || ph;
        if (!d || typeof d !== "string" || !d.startsWith("data:")) return;
        const ext = d.startsWith("data:image/png") ? "png" : d.startsWith("data:image/gif") ? "gif" : "jpg";
        const b64 = d.split(",")[1];
        if (b64) { zip.file(`${key}${arr.length>1?`_${i+1}`:""}.${ext}`, b64, {base64:true}); count++; }
      });
    });
    if (count === 0) { alert("No photos in this project"); return; }
    const blob = await zip.generateAsync({type:"blob"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${name}_photos.zip`;
    a.click(); URL.revokeObjectURL(url);
  };

const exportProjectForms = async (proj) => {
    if (typeof JSZip === "undefined" || typeof jspdf === "undefined") { alert("Libraries not loaded — refresh"); return; }
    const zip = new window.JSZip();
    const nm = (proj.customerName||"unnamed").replace(/[^a-zA-Z0-9]/g,"_");
    const p = proj;

    // Status
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:#0f172a;z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;font-family:Arial;color:#e2e8f0";
    overlay.innerHTML = '<div style="font-size:16px;font-weight:bold">Generating PDFs…</div><div id="pdf-step" style="font-size:13px;color:#94a3b8"></div>';
    document.body.appendChild(overlay);
    const stepEl = overlay.querySelector("#pdf-step");

    // Pure jsPDF text-based PDF builder — no html2canvas
    const { jsPDF } = window.jspdf;

    function buildPDF(title, sections) {
      const doc = new jsPDF({ unit:"pt", format:"letter" });
      const W = 612, H = 792, ML = 40, MR = 40, MT = 40, MB = 40;
      const CW = W - ML - MR; // content width
      let y = MT;
      const black = [0,0,0], gray = [100,100,100], green = [22,163,74], red = [220,38,38], ltgray = [180,180,180];

      const checkPage = (need) => { if (y + need > H - MB) { doc.addPage(); y = MT; } };

      // Title
      doc.setFontSize(16); doc.setFont("helvetica","bold"); doc.setTextColor(...black);
      doc.text(title, ML, y + 14); y += 20;
      doc.setDrawColor(...black); doc.setLineWidth(1.5); doc.line(ML, y, W - MR, y); y += 6;

      // Sub
      doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(...gray);
      doc.text((p.customerName||"") + " · " + (p.address||"") + " · " + new Date().toLocaleDateString(), ML, y + 9); y += 18;

      sections.forEach(sec => {
        checkPage(40);
        // Section header
        doc.setFontSize(11); doc.setFont("helvetica","bold"); doc.setTextColor(...black);
        doc.text(sec.title, ML, y + 11); y += 14;
        doc.setDrawColor(...ltgray); doc.setLineWidth(0.5); doc.line(ML, y, W - MR, y); y += 6;

        if (sec.table) {
          // Table with columns
          const cols = sec.table.cols;
          const rows = sec.table.rows;
          const colW = cols.map(c => c.w || (CW / cols.length));
          // Header row
          checkPage(18);
          doc.setFillColor(235, 235, 235);
          doc.rect(ML, y, CW, 16, "F");
          doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(...black);
          let cx = ML;
          cols.forEach((c, ci) => { doc.text(c.label, cx + 3, y + 11, { maxWidth: colW[ci] - 6 }); cx += colW[ci]; });
          y += 16;
          // Data rows
          doc.setFont("helvetica","normal"); doc.setFontSize(8);
          rows.forEach(row => {
            checkPage(16);
            cx = ML;
            row.forEach((cell, ci) => {
              const isObj = cell && typeof cell === "object";
              const txt = String(isObj ? (cell.t||"—") : (cell!=null ? cell : "—"));
              if (isObj && cell.c === "g") doc.setTextColor(...green);
              else if (isObj && cell.c === "r") doc.setTextColor(...red);
              else doc.setTextColor(...black);
              doc.text(txt, cx + 3, y + 10, { maxWidth: colW[ci] - 6 });
              cx += colW[ci];
            });
            doc.setDrawColor(240, 240, 240); doc.line(ML, y + 14, W - MR, y + 14);
            y += 15;
          });
          y += 4;
        }

        if (sec.rows) {
          doc.setFontSize(9);
          sec.rows.forEach(row => {
            checkPage(16);
            doc.setFont("helvetica","normal"); doc.setTextColor(...gray);
            const lbl = String(row[0]!=null ? row[0] : "—");
            const val = String(row[1]!=null ? row[1] : "—");
            doc.text(lbl, ML, y + 10, { maxWidth: CW * 0.55 });
            // Color
            if (row[2] === "g") doc.setTextColor(...green);
            else if (row[2] === "r") doc.setTextColor(...red);
            else { doc.setFont("helvetica","bold"); doc.setTextColor(...black); }
            doc.text(val, W - MR, y + 10, { align: "right", maxWidth: CW * 0.42 });
            doc.setDrawColor(245, 245, 245); doc.line(ML, y + 14, W - MR, y + 14);
            y += 15;
          });
          y += 4;
        }

        if (sec.text) {
          checkPage(20);
          doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(...gray);
          const lines = doc.splitTextToSize(sec.text, CW);
          lines.forEach(line => { checkPage(12); doc.text(line, ML, y + 10); y += 12; });
          y += 4;
        }

        if (sec.sig) {
          checkPage(60);
          doc.setDrawColor(...ltgray); doc.line(ML, y, ML + 200, y);
          doc.setFontSize(8); doc.setTextColor(...gray); doc.text("Signature (digitally signed)", ML, y + 10);
          y += 16;
        }
      });

      return doc.output("blob");
    }

    try {
      const a = p.audit || {};
      const fi = p.qaqc?.fi || {};
      const q = p.qaqc || {};

      // 1. Customer Auth — use image overlay approach with jsPDF addImage
      stepEl.textContent = "1/6 Customer Authorization…";
      if (a.customerAuthSig) {
        // For auth form, load the page images and overlay sig
        const loadImg = (src) => new Promise((res, rej) => {
          const img = new Image(); img.crossOrigin = "anonymous";
          img.onload = () => { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; c.getContext("2d").drawImage(img, 0, 0); res(c.toDataURL("image/jpeg", 0.92)); };
          img.onerror = rej; img.src = src;
        });
        try {
          const pg1 = await loadImg("/auth-form-page1.jpg");
          const pg2 = await loadImg("/auth-form-page2.jpg");
          const adoc = new jsPDF({ unit:"pt", format:"letter" });
          adoc.addImage(pg1, "JPEG", 0, 0, 612, 792);
          // Overlay signature data
          if (a.customerAuthSig) {
            adoc.addImage(a.customerAuthSig, "PNG", 260, 340, 160, 14);
            adoc.setFontSize(7); adoc.setFont("helvetica","bold");
            adoc.text(a.customerAuthName||p.customerName||"", 260, 365);
            const authDt = a.authDate ? new Date(a.authDate).toLocaleDateString("en-US") : "";
            adoc.setFont("helvetica","normal"); adoc.text(authDt, 260, 377);
            adoc.text(p.address||"", 260, 389);
          }
          adoc.addPage();
          adoc.addImage(pg2, "JPEG", 0, 0, 612, 792);
          zip.file(nm+"_customer_auth.pdf", adoc.output("blob"));
        } catch(e) { console.warn("Auth form images not available", e); }
      }

      // 2. Assessment
      stepEl.textContent = "2/6 Assessment…";
      zip.file(nm+"_assessment.pdf", buildPDF("Data Collection Tool — Assessment", [
        { title: "Project Info", rows: [
          ["RISE ID", p.riseId], ["Stage", STAGES[p.currentStage]?.label],
          ["Bedrooms", a.bedrooms], ["Bathrooms", a.bathrooms],
          ["Year Built", a.yearBuilt||p.yearBuilt], ["Sq Ft", a.sqft||p.sqft], ["Stories", a.stories]
        ]},
        { title: "Blower Door", rows: [["Pre CFM50", p.preCFM50], ["Post CFM50", p.postCFM50]] },
        { title: "CAZ Testing", rows: [
          ["Ambient CO", a.ambientCO], ["Heat Spillage", a.heatSpill], ["WH Spillage", a.whSpill],
          ["Heating CO", a.heatCO], ["WH CO", a.whCO], ["Oven CO", a.ovenCO]
        ].filter(r => r[1]) },
        ...(a.assessorSig ? [{ title: "Assessor", sig: true }] : [])
      ]));

      // 3. Scope
      stepEl.textContent = "3/6 Scope…";
      {
        const s2 = p.scope2026 || {};
        const htg = s2.htg||{}; const clg = s2.clg||{}; const dhw = s2.dhw||{};
        const int2 = s2.int||{}; const exh = s2.exh||{}; const att = s2.attic||{};
        const col2 = s2.collar||{}; const oCJ = s2.outerCeiling||{}; const kw = s2.kneeWall||{};
        const ew1 = s2.extWall1||{}; const ew2 = s2.extWall2||{}; const fnd = s2.fnd||{};
        const yr = new Date().getFullYear();
        const CK = b => b===true?"\u2611":b===false?"\u2610":"\u2014";
        const YN2 = b => b===true?"Yes":b===false?"No":"\u2014";
        const afue2 = (htg.btuIn && htg.btuOut) ? (Number(htg.btuOut)/Number(htg.btuIn)*100).toFixed(1)+"%" : "\u2014";

        const secs = [];
        secs.push({ title: "Customer Information", rows: [
          ["Customer", p.customerName], ["Address", p.address], ["RISE ID", p.riseId],
          ["Sq Ft", p.sqft], ["Volume", Number(p.sqft)?(Number(p.sqft)*8).toLocaleString()+" ft\u00b3":null],
          ["Stories", p.stories], ["Bedrooms", s2.bedrooms], ["Year Built", p.yearBuilt],
          ["Home Age", p.yearBuilt?(yr-Number(p.yearBuilt))+" yrs":null], ["Occupants", p.occupants]
        ]});
        secs.push({ title: "Building Property Type", rows: [
          ["Style", s2.style], ["Tenant Type", s2.tenantType],
          ["Gutters Exist", CK(s2.gutterExist)], ["Downspouts", CK(s2.downspouts)], ["Gutter Repairs", CK(s2.gutterRepair)],
          ["Roof Condition", s2.roofCondition], ["Roof Type", s2.roofType], ["Roof Age", s2.roofAge], ["Roof Repairs", CK(s2.roofRepair)]
        ]});
        secs.push({ title: "Interior Conditions", rows: [
          ["Ceiling Condition", s2.ceilingCond], ["Wall Condition", s2.wallCond], ["Walls Need Insulation", s2.wallsNeedInsul]
        ]});
        secs.push({ title: "Smoke / CO / Weatherization", rows: [
          ["Smoke \u2014 present", s2.smokePresent], ["Smoke \u2014 to install", s2.smokeNeeded],
          ["CO \u2014 present", s2.coPresent], ["CO \u2014 to install", s2.coNeeded],
          ["Tenmats Needed", s2.tenmats], ["Door Sweeps", s2.doorSweeps]
        ]});
        secs.push({ title: "Heating System", rows: [
          ["Thermostat", htg.thermostat], ["Fuel", htg.fuel], ["System", htg.system], ["Flue", htg.flue],
          ["Manufacturer", htg.mfg], ["Install Year", htg.year], ["Age", htg.year?(yr-Number(htg.year))+" yrs":null],
          ["Condition", htg.condition], ["BTU In", htg.btuIn], ["BTU Out", htg.btuOut], ["AFUE", afue2], ["Draft", htg.draft],
          ["Gas Shut Off", CK(htg.gasShutoff)], ["Asbestos Pipes", CK(htg.asbestosPipes)],
          ["Replace Rec", CK(htg.replaceRec)], ["Clean & Tune", CK(htg.cleanTune||htg.cleanTuneOverride)]
        ]});
        if (htg.notes) secs[secs.length-1].rows.push(["Notes", htg.notes]);
        secs.push({ title: "Cooling System", rows: [
          ["Type", clg.type], ["Manufacturer", clg.mfg], ["Install Year", clg.year],
          ["Age", clg.year?(yr-Number(clg.year))+" yrs":null], ["SEER", clg.seer],
          ["Condition", clg.condition], ["BTU Size", clg.btu], ["Replace Rec", CK(clg.replaceRec)]
        ]});
        secs.push({ title: "Domestic Hot Water", rows: [
          ["Fuel", dhw.fuel], ["System", dhw.system], ["Manufacturer", dhw.mfg],
          ["Install Year", dhw.year], ["Age", dhw.year?(yr-Number(dhw.year))+" yrs":null],
          ["Condition", dhw.condition], ["Input BTU", dhw.btuIn],
          ["Insulated Pipes", CK(dhw.insulPipes)], ["Flue Repair", CK(dhw.flueRepair)],
          ["Replace Rec", CK(dhw.replaceRec)], ["Ducts Sealing", CK(dhw.ductsSealed)]
        ]});
        secs.push({ title: "Interior Inspection", rows: [
          ["Mold", CK(int2.mold)], ["Moisture", CK(int2.moisture)], ["Knob & Tube", CK(int2.knobTube)],
          ["Electrical", CK(int2.electrical)], ["Broken Glass", CK(int2.brokenGlass)],
          ["Vermiculite", CK(int2.vermiculite)], ["Water Leaks", CK(int2.waterLeaks)], ["Roof Leaks", CK(int2.roofLeaks)],
          ["Ceiling", int2.ceiling], ["Wall", int2.wall],
          ["Dropped Ceiling", CK(int2.droppedCeiling)], ["Drywall Repair", CK(int2.drywallRepair)],
          ["Recessed Light", CK(int2.recessedLight)], ["CO Detector", CK(int2.coDetector)], ["Smoke Detector", CK(int2.smokeDetector)]
        ]});
        secs.push({ title: "Door Types / Exhaust", rows: [
          ["Front", CK(s2.doors?.Front)], ["Back", CK(s2.doors?.Back)],
          ["Basement", CK(s2.doors?.Basement)], ["Attic", CK(s2.doors?.Attic)],
          ["Sweeps Needed", s2.totalSweeps],
          ["Fan Replace", CK(exh.fanReplace)], ["Bath Fan Light", CK(exh.bathFanLight)],
          ["Vent Kit", CK(exh.ventKit)], ["Term Cap", CK(exh.termCap)],
          ["Dryer Proper", CK(exh.dryerProper)], ["Dryer Repair", CK(exh.dryerRepair)],
          ["BD In", exh.bdIn], ["BD Out", exh.bdOut]
        ]});
        secs.push({ title: "Attic", rows: [
          ["Finished", CK(att.finished)], ["Unfinished", CK(att.unfinished)], ["Flat", CK(att.flat)],
          ["Sq Ft", att.sqft], ["Pre R", att.preR], ["R to Add", att.addR],
          ["Total R", (att.preR||att.addR)?"R-"+(Number(att.preR||0)+Number(att.addR||0)):null],
          ["Ductwork", CK(att.ductwork)], ["Floor Boards", CK(att.floorBoards)],
          ["Mold", CK(att.moldPresent)], ["Vermiculite", CK(att.vermPresent)], ["Knob & Tube", CK(att.knobTube)],
          ["Existing Vent", att.existVent], ["Needed Vent", att.needVent], ["Access", att.accessLoc]
        ]});
        secs.push({ title: "Collar Beam", rows: [
          ["Sq Ft", col2.sqft], ["Pre R", col2.preR], ["R to Add", col2.addR],
          ["Accessible", CK(col2.accessible)], ["Cut In", CK(col2.cutIn)], ["Ductwork", CK(col2.ductwork)]
        ]});
        secs.push({ title: "Outer Ceiling Joists", rows: [
          ["Sq Ft", oCJ.sqft], ["Pre R", oCJ.preR], ["R to Add", oCJ.addR],
          ["Accessible", CK(oCJ.accessible)], ["Cut In", CK(oCJ.cutIn)], ["Ductwork", CK(oCJ.ductwork)]
        ]});
        secs.push({ title: "Knee Walls", rows: [
          ["Sq Ft", kw.sqft], ["Pre R", kw.preR], ["R to Add", kw.addR],
          ["Dense Pack", YN2(kw.densePack)], ["Rigid Foam", YN2(kw.rigidFoam)],
          ["Tyvek", YN2(kw.tyvek)], ["Wall Type", kw.wallType]
        ]});
        secs.push({ title: "Ext Walls \u2014 1st Floor", rows: [
          ["Sq Ft", ew1.sqft], ["Pre R", ew1.preR], ["R to Add", ew1.addR],
          ["Dense Pack", YN2(ew1.densePack)], ["Cladding", ew1.cladding],
          ["Insulate From", ew1.insulFrom], ["Wall Type", ew1.wallType], ["Phenolic", YN2(ew1.phenolic)]
        ]});
        secs.push({ title: "Ext Walls \u2014 2nd Floor", rows: [
          ["Sq Ft", ew2.sqft], ["Pre R", ew2.preR], ["R to Add", ew2.addR],
          ["Dense Pack", YN2(ew2.densePack)], ["Cladding", ew2.cladding]
        ]});
        secs.push({ title: "Foundation / Crawl", rows: [
          ["Type", fnd.type], ["Above SqFt", fnd.aboveSqft], ["Below SqFt", fnd.belowSqft],
          ["Pre R", fnd.preR], ["Insul Type", fnd.insulType],
          ["Band Access", CK(fnd.bandAccess)], ["Band LnFt", fnd.bandLnft],
          ["Vented", CK(fnd.vented)], ["Vapor Barrier", YN2(fnd.vaporBarrier)], ["Water Issues", YN2(fnd.waterIssues)],
          ["Crawl Duct", CK(fnd.crawlDuct)], ["Crawl Floor", fnd.crawlFloor],
          ["Crawl Above", fnd.crawlAbove], ["Crawl Below", fnd.crawlBelow], ["Crawl R", fnd.crawlR]
        ]});
        secs.push({ title: "Diagnostics", rows: [
          ["Pre CFM50", p.preCFM50], ["Ext Temp", s2.extTemp], ["BD Location", p.bdLoc]
        ]});

        // ASHRAE
        var baseSq2 = Number(p.sqft)||0;
        var finB = fnd.type==="Finished"?(Number(fnd.aboveSqft)||0)+(Number(fnd.belowSqft)||0):0;
        var sqA = baseSq2+finB; var NbrA = Number(s2.bedrooms)||0; var Q50A = Number(p.preCFM50)||0;
        var stA = Number(p.stories)||1; var HA = stA>=2?16:stA>=1.5?14:8;
        var qiA = Q50A>0?0.052*Q50A*0.56*Math.pow(HA/8.2,0.4):0;
        var qtA = sqA>0?0.03*sqA+7.5*(NbrA+1):0;
        var ash2 = s2.ashrae||{}; var a2 = p.audit||{};
        var kC2=Number(ash2.kitchenCFM||a2.kitchenFan||0); var b1C=Number(ash2.bath1CFM||a2.bathFan1||0);
        var b2C=Number(ash2.bath2CFM||a2.bathFan2||0); var b3C=Number(ash2.bath3CFM||a2.bathFan3||0);
        var kD2=kC2>0?Math.max(0,100-(ash2.kWin?20:kC2)):0;
        var b1D2=b1C>0?Math.max(0,50-(ash2.b1Win?20:b1C)):0;
        var b2D2=b2C>0?Math.max(0,50-(ash2.b2Win?20:b2C)):0;
        var b3D2=b3C>0?Math.max(0,50-(ash2.b3Win?20:b3C)):0;
        var tdA=kD2+b1D2+b2D2+b3D2; var suppA=tdA*0.25;
        var qfA=qtA+suppA-qiA;
        var RN=function(x){return Math.round(x*100)/100;};
        var fanA=Number(ash2.fanSetting)||0;

        secs.push({ title: "ASHRAE 62.2-2016 Ventilation", rows: [
          ["Floor Area", sqA+" ft\u00b2"], ["Nbr (bedrooms)", NbrA], ["Occupants (Nbr+1)", NbrA+1], ["Height", HA+" ft"],
          ["Leakage @50Pa", Q50A+" CFM"],
          ["Kitchen Fan", kC2>0?kC2+" CFM":null], ["Bath #1", b1C>0?b1C+" CFM":null],
          ["Bath #2", b2C>0?b2C+" CFM":null], ["Bath #3", b3C>0?b3C+" CFM":null],
          ["Total Deficit", Math.round(tdA)+" CFM"],
          ["Infiltration (Qinf)", RN(qiA)+" CFM"],
          ["Qtot", RN(qtA)+" CFM"], ["Supplement", RN(suppA)+" CFM"],
          ["Qfan Required", RN(qfA)+" CFM", qfA>0?"r":"g"]
        ]});
        if(fanA>0) secs[secs.length-1].rows.push(["Fan Setting", fanA+" CFM"], ["Run-time", RN(qfA/fanA*60)+" min/hr"]);

        // Measures
        if (p.measures?.length) secs.push({ title: "EE Measures ("+p.measures.length+")", table: {
          cols: [{label:"Measure",w:380},{label:"Qty",w:60},{label:"Unit",w:92}],
          rows: p.measures.map(function(m) { return [m, getResolvedQty(p,m)||"\u2014", measUnit(m)]; })
        }});
        if (p.healthSafety?.length) secs.push({ title: "H&S Measures ("+p.healthSafety.length+")", table: {
          cols: [{label:"Measure",w:432},{label:"Qty",w:100}],
          rows: p.healthSafety.map(function(m) { return [m, getResolvedQty(p,m)||"\u2014"]; })
        }});

        // Insulation quantities
        secs.push({ title: "Notes", rows: [["Work Notes", p.measureNotes], ["H&S Notes", s2.hsNotes]] });

        zip.file(nm+"_scope.pdf", buildPDF("2026 HEA/IE Retrofit Form \u2014 Scope of Work", secs));
      }

      // 4. Final Inspection
      stepEl.textContent = "4/6 Final Inspection…";
      {
        const secs = [];
        secs.push({ title: "Inspection Info", rows: [
          ["Homeowner name", p.customerName], ["Home address", p.address],
          ["Date of final inspection", fi.date], ["Installation Contractor", fi.contractor||"Assured Energy Solutions"]
        ]});
        secs.push({ title: "Health & Safety", table: {
          cols: [{label:"Item",w:240},{label:"Reading",w:80},{label:"Pass/Fail",w:60},{label:"Follow-up",w:60}],
          rows: FI_SAFETY.map(item => {
            const d = fi[item.k]||{};
            return [
              (item.sub?"   ":"")+item.l,
              d.reading ? d.reading+" "+(item.u||"") : (d.yn||"—"),
              { t: d.pf==="P"?"Pass":d.pf==="F"?"Fail":"N/A", c: d.pf==="P"?"g":d.pf==="F"?"r":"" },
              d.fu==="Y"?"Yes":d.fu==="N"?"No":"N/A"
            ];
          })
        }});
        secs.push({ title: "Detectors & Ventilation", rows: [
          ["Smoke detectors installed", fi.smokeQty||"—"],
          ["CO detectors installed", fi.coQty||"—"],
          ["Required ventilation ASHRAE 62.2", (fi.ventCFM||"—")+" CFM"],
          ["New exhaust fan installed?", fi.newFan||"—"],
          ["All H&S issues addressed?", fi.hsAddressed||"—", fi.hsAddressed==="Yes"?"g":"r"],
          ...(fi.hsWhyNot ? [["If no, why not", fi.hsWhyNot]] : [])
        ]});
        secs.push({ title: "Insulation", table: {
          cols: [{label:"Area",w:170},{label:"Pre R-value",w:90},{label:"Post R-value",w:90},{label:"Insulated?",w:90}],
          rows: FI_INSUL.map(ins => { const d=fi[ins.k]||{}; return [ins.l, d.preR||"—", d.postR||"—", d.done||"—"]; })
        }});
        secs.push({ title: "Combustion Appliances — Space Heating and DHW", table: {
          cols: [{label:"#",w:25},{label:"Equipment Type",w:180},{label:"Vent Type",w:120},{label:"Replaced?",w:70},{label:"Follow-up?",w:70}],
          rows: [1,2,3].map(n => { const d=fi["equip"+n]||{}; return [String(n), d.type||"—", d.vent||"—", d.replaced||"—", d.fu||"—"]; })
        }});
        secs.push({ title: "Blower Door", rows: [["Pre CFM50", p.preCFM50||"—"], ["Post CFM50", p.postCFM50||"—"]] });
        secs.push({ title: "Duct Sealing – Duct Blaster", rows: [["Pre CFM25", fi.preCFM25||"—"], ["Post CFM25", fi.postCFM25||"—"]] });
        secs.push({ title: "Direct Installs", rows: [["New thermostat installed?", fi.thermostat||"—"]] });
        secs.push({ title: "Follow-up Needed", text: fi.followUpNA?"N/A":(fi.followUp||"None") });
        secs.push({ title: "Contractor Checklist", rows: FI_CONTRACTOR_CK.map(ck => [ck, fi.ck?.[ck]?"☑ Done":"☐", fi.ck?.[ck]?"g":""]) });
        if (fi.inspectorSig) secs.push({ title: "Inspector", sig: true });
        zip.file(nm+"_final_inspection.pdf", buildPDF("Home Energy Savings – Retrofits Final Inspection Form", secs));
      }

      // 5. QAQC
      stepEl.textContent = "5/6 QAQC…";
      {
        const secs = [{ title: "Inspection Info", rows: [["Date", q.date||"—"], ["Inspector", q.inspector||"—"]] }];
        Object.entries(QAQC_SECTIONS).forEach(([cat, items]) => {
          secs.push({ title: cat, rows: items.map((item, i) => {
            const r = q.results?.[cat+"-"+i]||{};
            return [(i+1)+". "+item, (r.v||"—")+(r.c?" — "+r.c:""), r.v==="Y"?"g":r.v==="N"?"r":""];
          })});
        });
        secs.push({ title: "Overall Result", rows: [
          ["Result", q.passed===true?"PASS":q.passed===false?"FAIL":"—", q.passed===true?"g":"r"],
          ...(q.notes ? [["Notes", q.notes]] : [])
        ]});
        if (q.inspectorSig) secs.push({ title: "Inspector", sig: true });
        zip.file(nm+"_qaqc_observation.pdf", buildPDF("QAQC Observation Form", secs));
      }

      // 6. Activity Log
      stepEl.textContent = "6/6 Activity Log…";
      if (p.activityLog?.length) {
        zip.file(nm+"_activity_log.pdf", buildPDF("Activity Log", [
          { title: p.activityLog.length + " Entries", rows:
            p.activityLog.slice(0,100).map(l => [new Date(l.ts).toLocaleString()+" — "+l.by, l.txt])
          }
        ]));
      }

      stepEl.textContent = "Compressing ZIP…";
      const blob = await zip.generateAsync({type:"blob"});
      const url = URL.createObjectURL(blob);
      const dl = document.createElement("a"); dl.href = url; dl.download = nm+"_forms.zip";
      dl.click(); URL.revokeObjectURL(url);
    } catch(err) { alert("Error: "+err.message); console.error(err); }
    document.body.removeChild(overlay);
  };

        if (!curUser) return (
    <div style={S.app}>{globalCSS}
      <div style={S.rpWrap}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={S.logoBox}>⚡</div>
          <h1 style={{fontSize:20,fontWeight:700,color:"#f1f5f9",margin:"14px 0 2px"}}>HES Retrofits Tracker</h1>
          <p style={{color:"#64748b",fontSize:12}}>Sign in to continue</p>
        </div>
        <div style={{marginBottom:12}}>
          <label style={S.fl}>Username</label>
          <input style={S.inp} value={loginUser} onChange={e=>{setLoginUser(e.target.value);setLoginErr("");}} placeholder="Enter username" autoCapitalize="none" autoCorrect="off"/>
        </div>
        <div style={{marginBottom:16}}>
          <label style={S.fl}>PIN</label>
          <input style={S.inp} type="password" inputMode="numeric" value={loginPin} onChange={e=>{setLoginPin(e.target.value);setLoginErr("");}} placeholder="Enter PIN" maxLength={8}
            onKeyDown={e=>{if(e.key==="Enter")doLogin();}}/>
        </div>
        {loginErr && <div style={{color:"#ef4444",fontSize:12,marginBottom:10,textAlign:"center"}}>{loginErr}</div>}
        <button type="button" onClick={doLogin} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
          Sign In
        </button>
        <div style={{marginTop:20,padding:12,background:"rgba(255,255,255,.03)",borderRadius:8,border:"1px solid rgba(255,255,255,.06)"}}>
          <div style={{fontSize:10,color:"#64748b",marginBottom:6,textTransform:"uppercase",letterSpacing:".05em",fontWeight:600}}>Default Accounts</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"2px 12px",fontSize:11}}>
            <span style={{color:"#64748b",fontWeight:600}}>Username</span>
            <span style={{color:"#64748b",fontWeight:600}}>PIN</span>
            <span style={{color:"#64748b",fontWeight:600}}>Role</span>
            {(users||DEFAULT_USERS).map(u => (
              <React.Fragment key={u.id}>
                <span style={{color:"#94a3b8",fontFamily:"'JetBrains Mono',monospace"}}>{u.username}</span>
                <span style={{color:"#475569",fontFamily:"'JetBrains Mono',monospace"}}>{u.pin}</span>
                <span style={{color:"#94a3b8"}}>{ROLES.find(r=>r.key===u.role)?.label||u.role}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = curRole?.tabs || ROLES[0].tabs;

  // ── New Project ──────────────────────────────────────────
  if (view === "new") return (
    <div style={S.app}>{globalCSS}
      <Hdr role={curRole} user={userName} onSw={doLogout} onBack={()=>{setView("dash");setNewName("");setNewAddr("");}} title="New Lead"/>
      <div style={S.cnt}>
        <Sec title="RISE Lead → Create Project">
          <p style={{fontSize:12,color:"#94a3b8",marginBottom:12}}>Enter customer name & address from RISE. Add ST ID after creating in ServiceTitan.</p>
          <F label="Customer Name *" value={newName} onChange={setNewName}/>
          <div style={{height:10}}/>
          <F label="Address *" value={newAddr} onChange={setNewAddr}/>
          <div style={{marginTop:16,display:"flex",gap:8}}>
            <button style={{...S.btn,opacity:newName&&newAddr?1:.4,padding:"10px 20px",fontSize:14}}
              disabled={!newName||!newAddr}
              onClick={() => {
                const p = blank(); p.customerName = newName; p.address = newAddr;
                p.activityLog = [{ts:new Date().toISOString(),txt:"Lead created from RISE",by:userName,role}];
                up(prev => [p,...prev]);
                setSelId(p.id); setView("proj"); setTab("info");
                setNewName(""); setNewAddr("");
              }}>Create Lead</button>
            <button style={{...S.ghost,padding:"10px 16px"}} onClick={()=>{setView("dash");setNewName("");setNewAddr("");}}>Cancel</button>
          </div>
        </Sec>
      </div>
    </div>
  );

  // ── Project Detail ──────────────────────────────────────
  if (view === "proj" && proj) {
    const stage = STAGES[proj.currentStage];
    const alerts = getAlerts(proj);

    return (
      <div style={S.app}>{globalCSS}
        <Hdr role={curRole} user={userName} onSw={doLogout}
          onBack={()=>{setView("dash");setTab("info");}}
          title={proj.customerName||"Unnamed"} sub={proj.address}
          badge={<span style={{...S.bdg,background:stage.color}}>{stage.icon} {stage.label}</span>}
          actions={<><button style={{...S.ghost,padding:"5px 8px",fontSize:10}} onClick={()=>exportProjectPhotos(proj)}>📷 Photos</button><button style={{...S.ghost,padding:"5px 8px",fontSize:10}} onClick={()=>exportProjectForms(proj)}>📄 Forms</button></>}
        />
        {/* Stage bar */}
        <div style={S.stBar}>
          {STAGES.map(s => (
            <div key={s.id} style={{
              ...S.stStep,
              background: s.id <= proj.currentStage ? s.color : "rgba(255,255,255,0.04)",
              color: s.id <= proj.currentStage ? "#fff" : "#475569",
            }} title={s.label}>
              <span style={{fontSize:12}}>{s.icon}</span>
              <span style={{fontSize:7,lineHeight:1,textAlign:"center"}}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div style={S.alertBar}>
            {alerts.map((a,i) => (
              <div key={i} style={{marginRight:8}}>
                {a.type === "advance" ? (
                  <button style={{...S.btn,padding:"5px 12px",fontSize:11}} onClick={() => {
                    upP(proj.id, {currentStage:a.stage, stageHistory:[...proj.stageHistory,{s:a.stage,at:new Date().toISOString()}]});
                    addLog(proj.id, `Advanced → ${STAGES[a.stage].label}`);
                  }}>⬆ {a.msg}</button>
                ) : (
                  <span style={{fontSize:11,color:a.type==="warn"?"#fbbf24":"#93c5fd"}}>⚠ {a.msg}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={S.tabR}>
          {tabs.map(t => (
            <button key={t} style={{...S.tabB,...(tab===t?S.tabA:{})}} onClick={()=>setTab(t)}>
              {TAB_META[t]?.icon} {TAB_META[t]?.label}
            </button>
          ))}
        </div>

        <div style={S.cnt}>
          {tab==="info" && <InfoTab p={proj} u={c=>upC(proj.id,c)} role={role} onLog={t=>addLog(proj.id,t)} onDel={()=>{up(p=>p.filter(x=>x.id!==proj.id));setView("dash");}}/>}
          {tab==="scheduling" && <SchedTab p={proj} u={c=>upC(proj.id,c)} onLog={t=>addLog(proj.id,t)}/>}
          {tab==="assessment" && <AuditTab p={proj} u={c=>upC(proj.id,c)} onLog={t=>addLog(proj.id,t)} user={userName}/>}
          {tab==="photos" && <PhotoTab p={proj} u={c=>upC(proj.id,c)} onLog={t=>addLog(proj.id,t)} user={userName} role={role}/>}
          {tab==="scope" && <ScopeTab p={proj} u={c=>upC(proj.id,c)} onLog={t=>addLog(proj.id,t)}/>}
          {tab==="install" && <InstallTab p={proj} u={c=>upC(proj.id,c)} onLog={t=>addLog(proj.id,t)} user={userName} role={role}/>}
          {tab==="qaqc" && <QAQCTab p={proj} u={c=>upC(proj.id,c)}/>}
          {tab==="closeout" && <CloseoutTab p={proj} u={c=>upC(proj.id,c)} onLog={t=>addLog(proj.id,t)}/>}
          {tab==="log" && <LogTab p={proj} onLog={t=>addLog(proj.id,t)}/>}
        </div>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────
  const filtered = projects.filter(p => {
    if (filter === "alerts") return getAlerts(p).length > 0;
    if (filter !== "all" && p.currentStage !== parseInt(filter)) return false;
    if (search) { const s = search.toLowerCase(); return p.customerName.toLowerCase().includes(s) || p.address.toLowerCase().includes(s) || (p.riseId||"").toLowerCase().includes(s) || (p.stId||"").toLowerCase().includes(s); }
    return true;
  });
  const sorted = [...filtered].sort((a,b) => {
    if (a.flagged && !b.flagged) return -1;
    if (!a.flagged && b.flagged) return 1;
    const aa = getAlerts(a).length, ba = getAlerts(b).length;
    if (aa > 0 && ba === 0) return -1;
    if (aa === 0 && ba > 0) return 1;
    return new Date(b.created) - new Date(a.created);
  });
  const alertCount = projects.filter(p => getAlerts(p).length > 0).length;

  return (
    <div style={S.app}>{globalCSS}
      <Hdr role={curRole} user={userName} onSw={doLogout} title="HES Retrofits"
        sub={`${projects.length} projects`}
        actions={<>{role==="admin" && <><button style={{...S.ghost,padding:"6px 10px",fontSize:11}} onClick={()=>setShowUsers(!showUsers)}>👥 Users</button><button style={{...S.ghost,padding:"6px 10px",fontSize:11}} onClick={exportData}>📥 Data</button><button style={{...S.ghost,padding:"6px 10px",fontSize:11}} onClick={exportPhotos}>📷 Photos</button></>}<button style={{...S.btn,padding:"8px 16px",fontSize:13}} onClick={()=>setView("new")}>+ New Lead</button></>}
      />

      {/* ── User Management (Admin only) ── */}
      {showUsers && role === "admin" && <UserMgmt users={users} onSave={saveUserList} onDelete={async (id) => { await dbDeleteUser(id); setUsers(prev => prev.filter(u => u.id !== id)); }} onClose={()=>setShowUsers(false)}/>}

      {alertCount > 0 && (
        <div style={S.readyBan} onClick={() => setFilter(filter === "alerts" ? "all" : "alerts")}>
          <span style={{fontSize:18}}>🔔</span>
          <span style={{flex:1,fontSize:13}}><b>{alertCount}</b> need{alertCount>1?"":"s"} attention</span>
          <span style={{fontSize:11,color:"#fde68a"}}>{filter==="alerts"?"Show all":"Filter"} →</span>
        </div>
      )}

      <div style={S.pipe}>
        {STAGES.map(s => {
          const c = projects.filter(p => p.currentStage === s.id).length;
          return (
            <button key={s.id} style={{
              ...S.chip,
              background: filter === String(s.id) ? s.color : "rgba(255,255,255,0.06)",
              color: filter === String(s.id) ? "#fff" : "#94a3b8",
              borderColor: filter === String(s.id) ? s.color : "rgba(255,255,255,0.08)",
            }} onClick={() => setFilter(filter === String(s.id) ? "all" : String(s.id))}>
              {s.icon} <span style={S.chipN}>{c}</span>
            </button>
          );
        })}
      </div>

      {/* ── Ops Dashboard ── */}
      {filter === "all" && !search && projects.length > 0 && (()=>{
        const now = new Date();
        const daysAgo = (d) => d ? Math.floor((now - new Date(d))/(1000*60*60*24)) : null;
        const thisWeek = (d) => d && daysAgo(d) <= 7;
        const thisMonth = (d) => d && daysAgo(d) <= 30;

        // Pipeline counts
        const byStage = STAGES.map(st=>({...st, count:projects.filter(p=>p.currentStage===st.id).length}));
        const active = projects.filter(p=>p.currentStage>=1 && p.currentStage<7);
        const completed = projects.filter(p=>p.currentStage>=7);
        const needsScheduling = projects.filter(p=>p.customerName && p.address && !p.assessmentScheduled && !p.assessmentDate && p.currentStage<2).length;
        const needsInstallSched = projects.filter(p=>p.scopeApproved && !p.installScheduled && !p.installDate && p.currentStage<5).length;

        // Aging / stuck — days in current stage
        const aging = active.map(p=>{
          const lastLog = p.activityLog?.[0];
          const stageDate = lastLog?.ts || p.created;
          return {...p, daysInStage: daysAgo(stageDate)};
        }).sort((a,b)=>b.daysInStage-a.daysInStage);
        const stuck = aging.filter(p=>p.daysInStage>=7);

        // Throughput
        const completedThisWeek = projects.filter(p=>p.currentStage>=7 && p.activityLog?.find(a=>a.txt?.includes("Closeout") && thisWeek(a.ts))).length;
        const completedThisMonth = projects.filter(p=>p.currentStage>=7 && p.activityLog?.find(a=>a.txt?.includes("Closeout") && thisMonth(a.ts))).length;
        const assessThisWeek = projects.filter(p=>thisWeek(p.assessmentDate)).length;
        const installsThisWeek = projects.filter(p=>thisWeek(p.installDate)).length;

        // Average days to complete (created → stage 8)
        const compTimes = completed.map(p=>{const close=p.activityLog?.find(a=>a.txt?.includes("Closeout"));return close?daysAgo(p.created)-daysAgo(close.ts):null;}).filter(Boolean);
        const avgDays = compTimes.length ? Math.round(compTimes.reduce((a,b)=>a+b,0)/compTimes.length) : null;

        // Crew activity from logs
        const crewAct = {};
        projects.forEach(p=>p.activityLog?.forEach(a=>{if(a.by&&a.by!=="System"){crewAct[a.by]=(crewAct[a.by]||0)+1;}}));
        const topCrew = Object.entries(crewAct).sort((a,b)=>b[1]-a[1]).slice(0,5);

        // Measures installed
        const totalEE = projects.reduce((s,p)=>s+p.measures.length,0);
        const totalHS = projects.reduce((s,p)=>s+p.healthSafety.length,0);
        const mCount = {};
        projects.forEach(p=>[...p.measures,...p.healthSafety].forEach(m=>{mCount[m]=(mCount[m]||0)+1;}));
        const topM = Object.entries(mCount).sort((a,b)=>b[1]-a[1]).slice(0,5);

        // Hazard flags
        const hazards = projects.filter(p=>{const s=p.scope2026||{};return s.int?.knobTube||s.int?.vermiculite||s.int?.mold||s.attic?.knobTube||s.attic?.vermPresent||s.attic?.moldPresent;});

        const card = {borderRadius:8,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.06)",padding:"10px 12px",marginBottom:8};
        const hdr = {fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6,fontWeight:600};
        const kpi = {textAlign:"center",padding:"6px 4px"};
        const kpiN = {fontSize:22,fontWeight:700,lineHeight:1};
        const kpiL = {fontSize:8,color:"#64748b",marginTop:2,lineHeight:1.2};
        const row = {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0",fontSize:11};

        return <div style={{padding:"0 16px",marginBottom:6}}>
          {/* KPI Row */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:8}}>
            <div style={{...card,...kpi,marginBottom:0}}><div style={{...kpiN,color:"#e2e8f0"}}>{projects.length}</div><div style={kpiL}>Total Projects</div></div>
            <div style={{...card,...kpi,marginBottom:0}}><div style={{...kpiN,color:"#818cf8"}}>{active.length}</div><div style={kpiL}>Active</div></div>
            <div style={{...card,...kpi,marginBottom:0}}><div style={{...kpiN,color:"#22c55e"}}>{completed.length}</div><div style={kpiL}>Completed</div></div>
            <div style={{...card,...kpi,marginBottom:0}}><div style={{...kpiN,color:stuck.length>0?"#ef4444":"#22c55e"}}>{stuck.length}</div><div style={kpiL}>Stuck (7d+)</div></div>
            <div style={{...card,...kpi,marginBottom:0}}><div style={{...kpiN,color:"#f59e0b"}}>{avgDays||"—"}</div><div style={kpiL}>Avg Days</div></div>
          </div>

          {/* Action Items */}
          {(needsScheduling>0||needsInstallSched>0||hazards.length>0) && <div style={{...card,background:"rgba(239,68,68,.06)",borderColor:"rgba(239,68,68,.2)"}}>
            <div style={{...hdr,color:"#ef4444"}}>⚡ Action Required</div>
            {needsScheduling>0 && <div style={{...row,color:"#fca5a5"}}><span>Needs assessment scheduling</span><b>{needsScheduling}</b></div>}
            {needsInstallSched>0 && <div style={{...row,color:"#fca5a5"}}><span>Needs install scheduling</span><b>{needsInstallSched}</b></div>}
            {hazards.length>0 && <div style={{...row,color:"#fca5a5"}}><span>⛔ Hazard flags (K&T/asbestos/mold)</span><b>{hazards.length}</b></div>}
          </div>}

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {/* Pipeline Breakdown */}
            <div style={card}>
              <div style={hdr}>Pipeline</div>
              {byStage.filter(s=>s.count>0).map(s=><div key={s.id} style={row}>
                <span style={{color:"#94a3b8"}}>{s.icon} {s.label}</span>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:Math.min(s.count/Math.max(...byStage.map(x=>x.count))*60,60),height:6,borderRadius:3,background:s.color,minWidth:4}}/>
                  <span style={{fontWeight:600,color:"#e2e8f0",minWidth:16,textAlign:"right"}}>{s.count}</span>
                </div>
              </div>)}
            </div>

            {/* Weekly Throughput */}
            <div style={card}>
              <div style={hdr}>This Week</div>
              <div style={row}><span style={{color:"#94a3b8"}}>Assessments</span><b style={{color:"#818cf8"}}>{assessThisWeek}</b></div>
              <div style={row}><span style={{color:"#94a3b8"}}>Installs</span><b style={{color:"#f59e0b"}}>{installsThisWeek}</b></div>
              <div style={row}><span style={{color:"#94a3b8"}}>Completed</span><b style={{color:"#22c55e"}}>{completedThisWeek}</b></div>
              <div style={{...hdr,marginTop:8}}>This Month</div>
              <div style={row}><span style={{color:"#94a3b8"}}>Completed</span><b style={{color:"#22c55e"}}>{completedThisMonth}</b></div>
              <div style={row}><span style={{color:"#94a3b8"}}>Measures installed</span><b style={{color:"#e2e8f0"}}>{totalEE+totalHS}</b></div>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {/* Stuck Projects */}
            {stuck.length>0 && <div style={{...card,background:"rgba(245,158,11,.04)",borderColor:"rgba(245,158,11,.15)"}}>
              <div style={{...hdr,color:"#f59e0b"}}>⏳ Aging Projects</div>
              {stuck.slice(0,5).map(p=><div key={p.id} style={{...row,cursor:"pointer"}} onClick={()=>{setSelId(p.id);setView("detail");setTab("info");}}>
                <span style={{color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginRight:6}}>{p.customerName||"Unnamed"}</span>
                <span style={{flexShrink:0}}><span style={{color:STAGES[p.currentStage].color,fontSize:10}}>{STAGES[p.currentStage].icon}</span> <b style={{color:p.daysInStage>=14?"#ef4444":"#f59e0b"}}>{p.daysInStage}d</b></span>
              </div>)}
              {stuck.length>5 && <div style={{fontSize:9,color:"#64748b",textAlign:"center",marginTop:4}}>+{stuck.length-5} more</div>}
            </div>}

            {/* Team Activity */}
            {topCrew.length>0 && <div style={card}>
              <div style={hdr}>Team Activity</div>
              {topCrew.map(([name,count])=><div key={name} style={row}>
                <span style={{color:"#94a3b8"}}>{name}</span>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:Math.min(count/Math.max(...topCrew.map(x=>x[1]))*50,50),height:5,borderRadius:3,background:"#818cf8",minWidth:4}}/>
                  <span style={{fontWeight:600,color:"#e2e8f0",minWidth:20,textAlign:"right"}}>{count}</span>
                </div>
              </div>)}
              <div style={{fontSize:8,color:"#475569",marginTop:4}}>Actions logged (all time)</div>
            </div>}
          </div>

          {/* Top Measures */}
          {topM.length>0 && <div style={card}>
            <div style={hdr}>Top Measures Across Portfolio</div>
            {topM.map(([m,c])=><div key={m} style={row}>
              <span style={{color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginRight:8}}>{m}</span>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:Math.min(c/Math.max(...topM.map(x=>x[1]))*80,80),height:5,borderRadius:3,background:"#22c55e",minWidth:4}}/>
                <span style={{fontWeight:600,color:"#e2e8f0",minWidth:20,textAlign:"right"}}>{c}</span>
              </div>
            </div>)}
          </div>}
        </div>;
      })()}

      <div style={S.sRow}>
        <input style={S.sInp} placeholder="Search name, address, RISE, ST…" value={search} onChange={e => setSearch(e.target.value)}/>
        {(filter !== "all" || search) && <button style={S.ghost} onClick={() => {setFilter("all");setSearch("");}}>Clear</button>}
      </div>

      {sorted.length === 0 ? (
        <div style={S.empty}>
          <p style={{fontSize:32}}>📂</p>
          <p style={{color:"#64748b",fontSize:13}}>{projects.length===0?"No projects yet. Tap + New Lead.":"No matches."}</p>
        </div>
      ) : (
        <div style={S.list}>
          {sorted.map(p => {
            const st = STAGES[p.currentStage];
            const al = getAlerts(p);
            return (
              <button key={p.id} style={S.card} onClick={() => {setSelId(p.id);setView("proj");setTab(tabs[0]);}}>
                <div style={S.cTop}>
                  <div style={{display:"flex",alignItems:"center",gap:5,flex:1,minWidth:0}}>
                    {p.flagged && <span>⚠️</span>}
                    <span style={S.cName}>{p.customerName}</span>
                  </div>
                  <span style={{...S.bdg,background:st.color,fontSize:10}}>{st.icon} {st.label}</span>
                </div>
                <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{p.address}</div>
                {al.length > 0 && (
                  <div style={{display:"flex",gap:4,marginTop:5,flexWrap:"wrap"}}>
                    {al.map((a,i) => <span key={i} style={{...S.tBadge,...(a.type==="co"?{background:"rgba(249,115,22,.15)",color:"#f97316",border:"1px solid rgba(249,115,22,.3)"}:{})}}>{a.type==="advance"?"⬆":a.type==="co"?"🔶":"🔔"} {a.msg}</span>)}
                  </div>
                )}
                <div style={S.cMeta}>
                  {p.riseId && <span>RISE:{p.riseId}</span>}
                  {p.stId && <span>ST:{p.stId}</span>}
                  {p.assessmentDate && <span>Assess:{fmts(p.assessmentDate)}</span>}
                  {p.installDate && <span>Install:{fmts(p.installDate)}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB COMPONENTS
// ═══════════════════════════════════════════════════════════════

function InfoTab({p,u,role,onLog,onDel}) {
  const [del,setDel] = useState(false);
  return (
    <div>
      <Sec title="Customer">
        <Gr><F label="Name" value={p.customerName} onChange={v=>u({customerName:v})}/><F label="Address" value={p.address} onChange={v=>u({address:v})}/></Gr>
        <Gr><F label="Phone" value={p.phone} onChange={v=>u({phone:v})}/><F label="Email" value={p.email} onChange={v=>u({email:v})}/></Gr>
      </Sec>
      <Sec title="System IDs">
        <p style={{fontSize:11,color:"#64748b",marginBottom:8}}>Lookup customer in ST, enter IDs here</p>
        <Gr><F label="RISE ID" value={p.riseId} onChange={v=>u({riseId:v})}/><F label="ServiceTitan ID" value={p.stId} onChange={v=>u({stId:v})}/><F label="Utility" value={p.utility} onChange={v=>u({utility:v})} placeholder="Nicor, ComEd…"/></Gr>
      </Sec>

      <Sec title="Flags & Notes">
        <CK checked={p.flagged} onChange={v=>u({flagged:v})} label="⚠️ Flag this project"/>
        {p.flagged && <div style={{marginTop:6}}><F label="Reason" value={p.flagReason} onChange={v=>u({flagReason:v})}/></div>}
        <div style={{marginTop:8}}><label style={S.fl}>Notes</label><textarea style={S.ta} value={p.internalNotes} onChange={e=>u({internalNotes:e.target.value})} rows={3}/></div>
      </Sec>
      {role === "admin" && (
        <Sec title="Danger Zone" danger>
          {!del ? <button style={{...S.ghost,color:"#ef4444",borderColor:"#ef4444"}} onClick={()=>setDel(true)}>Delete Project</button> : (
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button style={{...S.btn,background:"#ef4444"}} onClick={onDel}>Confirm Delete</button>
              <button style={S.ghost} onClick={()=>setDel(false)}>Cancel</button>
            </div>
          )}
        </Sec>
      )}
    </div>
  );
}

function SchedTab({p,u,onLog}) {
  const alerts = getAlerts(p).filter(a => a.type === "schedule");
  const showInstall = p.scopeApproved || p.currentStage >= 4;
  return (
    <div>
      {alerts.length > 0 && <div style={S.alertBox}><span style={{fontSize:18}}>🔔</span><div style={{flex:1}}>{alerts.map((a,i)=><div key={i} style={{fontSize:12,color:"#fde68a"}}>• {a.msg}</div>)}</div></div>}
      <Sec title="Assessment">
        <F label="Assessment Date" value={p.assessmentDate} onChange={v=>{u({assessmentDate:v,assessmentScheduled:!!v});if(v)onLog(`Assessment scheduled: ${fmts(v)}`);}} type="date"/>
        <div style={{marginTop:6}}><textarea style={S.ta} value={p.scheduleNotes} onChange={e=>u({scheduleNotes:e.target.value})} rows={2} placeholder="Customer availability, access notes…"/></div>
      </Sec>
      {showInstall ? (
        <Sec title="Install Scheduling">
          <Gr>
            <F label="Install Date" value={p.installDate} onChange={v=>{u({installDate:v});if(v)onLog(`Install scheduled: ${fmts(v)}`);}} type="date"/>
            <F label="Tune/Clean" value={p.tuneCleanDate} onChange={v=>u({tuneCleanDate:v})} type="date"/>
            <F label="Final Insp." value={p.finalInspDate} onChange={v=>u({finalInspDate:v})} type="date"/>
          </Gr>
          <div style={{marginTop:8}}>
            <CK checked={p.installScheduled} onChange={v=>{u({installScheduled:v});if(v)onLog("Install confirmed in ST");}} label="Install Confirmed in ST"/>
          </div>
        </Sec>
      ) : (
        <Sec title="Install Scheduling">
          <p style={{fontSize:12,color:"#64748b"}}>Install scheduling opens after scope is approved.</p>
        </Sec>
      )}
    </div>
  );
}

function AuditTab({p,u,onLog,user}) {
  const a = p.audit || {};
  const sa = (k,v) => u({audit:{...a,[k]:v}});
  const [prev, setPrev] = useState(null); // {id, idx}

  // ── Pre Photos ──
  const preSections = Object.entries(PHOTO_SECTIONS).filter(([cat]) => cat.includes("(Pre)"));
  const preItems = preSections.flatMap(([cat,items])=>items.map(i=>({...i,cat})));
  const preTaken = preItems.filter(i=>hasPhoto(p.photos,i.id)).length;

  const handleFile = (id, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (file.type === "image/gif") {
        const existing = getPhotos(p.photos, id);
        const newEntry = {d:e.target.result,at:new Date().toISOString(),by:user};
        u({photos:{...p.photos,[id]:[...existing, newEntry]}});
        if(onLog) onLog(`📸 ${preItems.find(x=>x.id===id)?.l||id} (${existing.length+1})`);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const maxW = 1600;
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        const existing = getPhotos(p.photos, id);
        const newEntry = {d:c.toDataURL("image/jpeg",0.7),at:new Date().toISOString(),by:user};
        u({photos:{...p.photos,[id]:[...existing, newEntry]}});
        if(onLog) onLog(`📸 ${preItems.find(x=>x.id===id)?.l||id} (${existing.length+1})`);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Photo preview
  if (prev) {
    const arr = getPhotos(p.photos, prev.id);
    const ph = arr[prev.idx]; const it = preItems.find(x=>x.id===prev.id);
    return (
      <div style={S.camOv}>
        <div style={S.camH}>
          <button style={{...S.back,fontSize:18}} onClick={()=>setPrev(null)}>← Back</button>
          <div style={{flex:1,textAlign:"center",fontWeight:600,fontSize:14}}>{it?.l} {arr.length>1?`(${prev.idx+1}/${arr.length})`:""}</div>
          <button style={{...S.ghost,color:"#ef4444",borderColor:"#ef4444",padding:"4px 10px"}} onClick={()=>{
            const remaining = arr.filter((_,i)=>i!==prev.idx);
            u({photos:{...p.photos,[prev.id]:remaining.length?remaining:undefined}});
            if(onLog)onLog(`🗑️ Removed ${it?.l||prev.id}`);setPrev(null);
          }}>Delete</button>
        </div>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:"#000",padding:8,position:"relative"}}>
          {ph?.d && <img src={ph.d} style={{maxWidth:"100%",maxHeight:"80vh",borderRadius:8}} alt=""/>}
          {arr.length > 1 && prev.idx > 0 && <button onClick={()=>setPrev({...prev,idx:prev.idx-1})} style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,.5)",color:"#fff",border:"none",borderRadius:"50%",width:36,height:36,fontSize:18,cursor:"pointer"}}>‹</button>}
          {arr.length > 1 && prev.idx < arr.length-1 && <button onClick={()=>setPrev({...prev,idx:prev.idx+1})} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,.5)",color:"#fff",border:"none",borderRadius:"50%",width:36,height:36,fontSize:18,cursor:"pointer"}}>›</button>}
        </div>
        <div style={{padding:12,textAlign:"center",fontSize:11,color:"#94a3b8"}}>{ph?.by} · {ph?.at&&new Date(ph.at).toLocaleString()}</div>
      </div>
    );
  }

  const getAuditHTML = () => {
    const body = `
      <div class="sec"><h3>Basic Info</h3><div class="grid">
        <div class="row"><span class="lbl">Occupants</span><span class="val">${a.occupants||"—"}</span></div>
        <div class="row"><span class="lbl">Tenant Type</span><span class="val">${a.tenantType||"—"}</span></div>
        <div class="row"><span class="lbl">Roof Age</span><span class="val">${a.roofAge||"—"}</span></div>
        <div class="row"><span class="lbl">Thermostat</span><span class="val">${a.thermostatType||"—"}</span></div>
        <div class="row"><span class="lbl">Ceiling</span><span class="val">${a.ceilingCond||"—"}</span></div>
        <div class="row"><span class="lbl">Walls</span><span class="val">${a.wallCond||"—"}</span></div>
        <div class="row"><span class="lbl">Walls Need Insul.</span><span class="val">${a.wallsNeedInsul||"—"}</span></div>
      </div></div>
      <div class="sec"><h3>Fan Testing</h3><div class="grid">
        <div class="row"><span class="lbl">Bath Fan 1</span><span class="val">${a.bathFan1||"—"} CFM</span></div>
        <div class="row"><span class="lbl">Bath Fan 2</span><span class="val">${a.bathFan2||"—"} CFM</span></div>
        <div class="row"><span class="lbl">Bath Fan 3</span><span class="val">${a.bathFan3||"—"} CFM</span></div>
        <div class="row"><span class="lbl">Kitchen Fan</span><span class="val">${a.kitchenFan||"—"} CFM</span></div>
      </div></div>
      <div class="sec"><h3>Smoke / CO</h3><div class="grid">
        <div class="row"><span class="lbl">Smoke Present</span><span class="val">${a.smokePresent||"—"}</span></div>
        <div class="row"><span class="lbl">Smoke to Install</span><span class="val">${a.smokeNeeded||"—"}</span></div>
        <div class="row"><span class="lbl">CO Present</span><span class="val">${a.coPresent||"—"}</span></div>
        <div class="row"><span class="lbl">CO to Install</span><span class="val">${a.coNeeded||"—"}</span></div>
      </div></div>
      <div class="sec"><h3>Weatherization</h3><div class="grid">
        <div class="row"><span class="lbl">Tenmats</span><span class="val">${a.tenmats||"—"}</span></div>
        <div class="row"><span class="lbl">Door Sweeps/WS</span><span class="val">${a.doorSweeps||"—"}</span></div>
      </div></div>
      <div class="sec"><h3>H&S Conditions</h3>${["Gas Mechanical Repair","Mold Remediation","Water/Sewage Issues","Asbestos Abatement","Electrical Issues","Other"].filter(x=>a.hsConds?.[x]).map(x=>`<span style="display:inline-block;padding:2px 8px;border:1px solid #ddd;border-radius:4px;margin:2px;font-size:11px">${x}</span>`).join("")||"<span style='color:#999'>None</span>"}</div>
      <div class="sec"><h3>Status</h3><div class="row"><span class="lbl">Deferred?</span><span class="val">${a.deferred||"—"}</span></div>${a.additionalNotes?`<p style="margin-top:6px;color:#666">${a.additionalNotes}</p>`:""}</div>`;
    return formPrintHTML("Data Collection Tool — Assessment", p, body, a.assessorSig);
  };

  return (
    <div>
      {/* ── CUSTOMER AUTHORIZATION FORM ── */}
      <Sec title={<span>Customer Authorization Form {a.customerAuthSig ? <span style={{color:"#22c55e",fontSize:11}}>✓ Signed</span> : <span style={{color:"#f59e0b",fontSize:11}}>⚠ Required</span>}</span>}>
        {/* Page 1 with signature fields overlaid on the form */}
        <div style={{position:"relative",background:"#fff",borderRadius:6,overflow:"hidden"}}>
          <img src="/auth-form-page1.jpg" alt="Page 1" style={{width:"100%",display:"block"}}/>
          {/* Overlay: Customer representative signature — row at 43.3%-44.9% */}
          <div style={{position:"absolute",top:"43.4%",left:"41.5%",width:"52%",height:"1.4%",cursor:"pointer",display:"flex",alignItems:"center"}} onClick={()=>{if(!a.customerAuthSig){const el=document.getElementById("authSigTrigger");if(el)el.click();}}}>
            {a.customerAuthSig && <img src={a.customerAuthSig} style={{height:"100%",objectFit:"contain"}}/>}
          </div>
          {/* Overlay: Customer representative printed name — row at 44.9%-46.5% */}
          <div style={{position:"absolute",top:"45%",left:"41.5%",width:"52%",height:"1.4%",display:"flex",alignItems:"center"}}>
            <input style={{width:"100%",height:"100%",border:"none",background:"transparent",fontSize:"1.2vw",fontWeight:600,color:"#000",outline:"none",fontFamily:"Arial,sans-serif",padding:0}} value={a.customerAuthName||p.customerName||""} onChange={e=>sa("customerAuthName",e.target.value)} placeholder=""/>
          </div>
          {/* Overlay: Date — row at 46.5%-48.1% */}
          <div style={{position:"absolute",top:"46.6%",left:"41.5%",width:"52%",height:"1.4%",display:"flex",alignItems:"center"}}>
            <span style={{fontSize:"1.2vw",color:"#000",fontFamily:"Arial,sans-serif"}}>{a.authDate ? new Date(a.authDate).toLocaleDateString("en-US") : ""}</span>
          </div>
          {/* Overlay: Property address — row at 48.1%-49.6% */}
          <div style={{position:"absolute",top:"48.2%",left:"41.5%",width:"52%",height:"1.4%",display:"flex",alignItems:"center"}}>
            <span style={{fontSize:"1.2vw",color:"#000",fontFamily:"Arial,sans-serif"}}>{p.address||""}</span>
          </div>
        </div>
        {/* Page 2 */}
        <div style={{background:"#fff",borderRadius:6,overflow:"hidden",marginTop:4}}>
          <img src="/auth-form-page2.jpg" alt="Page 2" style={{width:"100%",display:"block"}}/>
        </div>
        {/* Sign / Re-sign after both pages */}
        {!a.customerAuthSig && <div style={{marginTop:8}}>
          <SigPad label="Customer Signature" value={a.customerAuthSig||""} onChange={v=>{u({audit:{...a,customerAuthSig:v,...(v&&!a.authDate?{authDate:new Date().toISOString()}:{})}});}}/>
        </div>}
        {a.customerAuthSig && <div style={{marginTop:8,display:"flex",gap:8,flexWrap:"wrap"}}>
          <button style={{...S.btn,padding:"8px 16px",fontSize:12}} onClick={()=>{
            const sigImg = a.customerAuthSig ? `<img src="${a.customerAuthSig}" style="height:100%;object-fit:contain"/>` : "";
            const authDate = a.authDate ? new Date(a.authDate).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}) : "";
            savePrint(`<div style="max-width:720px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#000;padding:20px">
<div style="position:relative">
<img src="/auth-form-page1.jpg" style="width:100%;display:block"/>
<div style="position:absolute;top:43.4%;left:41.5%;width:52%;height:1.4%;display:flex;align-items:center;overflow:hidden">${sigImg}</div>
<div style="position:absolute;top:45%;left:41.5%;width:52%;height:1.4%;display:flex;align-items:center"><span style="font-size:9px;font-weight:bold;color:#000">${a.customerAuthName||p.customerName||""}</span></div>
<div style="position:absolute;top:46.6%;left:41.5%;width:52%;height:1.4%;display:flex;align-items:center"><span style="font-size:9px;color:#000">${authDate}</span></div>
<div style="position:absolute;top:48.2%;left:41.5%;width:52%;height:1.4%;display:flex;align-items:center"><span style="font-size:9px;color:#000">${p.address||""}</span></div>
</div>
<div style="page-break-before:always"></div>
<img src="/auth-form-page2.jpg" style="width:100%;display:block"/>
</div>`);
          }}>🖨️ Print Signed Form</button>
          <button style={{...S.ghost,padding:"8px 16px",fontSize:12,color:"#ef4444",borderColor:"rgba(239,68,68,.3)"}} onClick={()=>{u({audit:{...a,customerAuthSig:"",authDate:"",customerAuthName:""}});}}>✕ Clear & Re-sign</button>
        </div>}
      </Sec>

      <Sec title="📋 Data Collection Tool">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <p style={{fontSize:11,color:"#94a3b8",margin:0}}>For use with BLK2GO</p>
          <PrintBtn onClick={()=>savePrint(getAuditHTML())}/>
        </div>
        <p style={{fontSize:10,color:"#64748b",marginTop:4}}>Customer: <b>{p.customerName}</b> · {p.address} · Assessment: {p.assessmentDate ? fmts(p.assessmentDate) : "—"}</p>
      </Sec>

      <Sec title="Basic Info">
        <Gr>
          <F label="5. Number of Occupants *" value={a.occupants||""} onChange={v=>sa("occupants",v)} num/>
          <Sel label="6. Tenant Type *" value={a.tenantType||""} onChange={v=>sa("tenantType",v)} opts={["Owned","Rented"]}/>
          <F label="7. Roof Age (guesstimate) *" value={a.roofAge||""} onChange={v=>sa("roofAge",v)} num/>
        </Gr>
      </Sec>

      <Sec title="Interior Conditions">
        <Sel label="8. Thermostat Type *" value={a.thermostatType||""} onChange={v=>sa("thermostatType",v)} opts={["Non-programmable","Programmable","Smart","Other"]}/>
        <div style={{height:8}}/>
        <Gr>
          <Sel label="9. Drywall Ceiling Conditions *" value={a.ceilingCond||""} onChange={v=>sa("ceilingCond",v)} opts={["Good","Poor"]}/>
          <Sel label="10. Drywall Wall Conditions *" value={a.wallCond||""} onChange={v=>sa("wallCond",v)} opts={["Good","Fair","Poor"]}/>
        </Gr>
        <div style={{height:8}}/>
        <Sel label="11. Walls Need Insulation? *" value={a.wallsNeedInsul||""} onChange={v=>sa("wallsNeedInsul",v)} opts={["Yes","No","Other"]}/>
      </Sec>

      <Sec title="Pressure Pan / Fan Testing">
        <Gr>
          <F label="12. Bath Fan 1 CFM *" value={a.bathFan1||""} onChange={v=>sa("bathFan1",v)} num/>
          <F label="13. Bath Fan 2 CFM" value={a.bathFan2||""} onChange={v=>sa("bathFan2",v)} num/>
          <F label="14. Bath Fan 3 CFM" value={a.bathFan3||""} onChange={v=>sa("bathFan3",v)} num/>
          <F label="15. Kitchen Fan CFM" value={a.kitchenFan||""} onChange={v=>sa("kitchenFan",v)} num/>
        </Gr>
        <p style={{fontSize:10,color:"#64748b",marginTop:4}}>Q13-14 only if additional full baths present</p>
        <p style={{fontSize:10,color:"#f59e0b",marginTop:2}}>⚠ If a fan is present but not operational or CFM is unknown, enter 0. Leave blank if no fan exists.</p>
      </Sec>

      <Sec title="Smoke / CO Detectors">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <F label="16. Smoke — present *" value={a.smokePresent||""} onChange={v=>sa("smokePresent",v)} num/>
          <F label="17. Smoke — to install *" value={a.smokeNeeded||""} onChange={v=>sa("smokeNeeded",v)} num/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:6}}>
          <F label="18. CO — present *" value={a.coPresent||""} onChange={v=>sa("coPresent",v)} num/>
          <F label="19. CO — to install *" value={a.coNeeded||""} onChange={v=>sa("coNeeded",v)} num/>
        </div>
      </Sec>

      <Sec title="Weatherization">
        <Gr>
          <F label="20. Tenmats Needed *" value={a.tenmats||""} onChange={v=>sa("tenmats",v)} num/>
          <F label="21. Doors Need Sweeps/WS *" value={a.doorSweeps||""} onChange={v=>sa("doorSweeps",v)} num/>
        </Gr>
      </Sec>

      <Sec title="22. Health & Safety Conditions">
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"0px 8px"}}>
          {["Gas Mechanical Repair","Mold Remediation","Water/Sewage Issues","Asbestos Abatement","Electrical Issues","Other"].map(x =>
            <CK key={x} checked={a.hsConds?.[x]} onChange={v=>sa("hsConds",{...(a.hsConds||{}),[x]:v})} label={x}/>
          )}
        </div>
      </Sec>

      <Sec title="Blower Door">
        <Gr>
          <F label="Pre CFM50" value={p.preCFM50} onChange={v=>u({preCFM50:v})} num/>
          <F label="BD Location" value={p.bdLoc} onChange={v=>u({bdLoc:v})} placeholder="Front/Side"/>
          <F label="Ext. Temp" value={p.extTemp} onChange={v=>u({extTemp:v})} placeholder="°F" num/>
        </Gr>
        {p.preCFM50 && p.sqft && <div style={S.calc}><span>Pre CFM50: <b>{p.preCFM50}</b></span><span style={{color:Number(p.preCFM50)>=Number(p.sqft)*1.1?"#22c55e":"#f59e0b",marginLeft:10}}>{Number(p.preCFM50)>=Number(p.sqft)*1.1?"✓ ≥110% sqft":"⚠ <110% sqft"}</span></div>}
      </Sec>

      <Sec title="CAZ Testing">
        {CAZ_ITEMS.map(c => {
          const r = p.cazResults?.[c.k] || {};
          return (
            <div key={c.k} style={S.cazR}>
              <span style={{flex:1,fontSize:12,minWidth:120}}>{c.l}</span>
              {c.r && <input style={{...S.inp,width:60,textAlign:"center"}} value={r.reading||""} onChange={e=>u({cazResults:{...p.cazResults,[c.k]:{...(p.cazResults?.[c.k]||{}),reading:e.target.value}}})} placeholder={c.u}/>}
              <BtnGrp value={r.result||""} onChange={v=>u({cazResults:{...p.cazResults,[c.k]:{...(p.cazResults?.[c.k]||{}),result:v}}})} opts={[{v:"pass",l:"Pass",c:"#22c55e"},{v:"fail",l:"Fail",c:"#ef4444"},{v:"na",l:"N/A",c:"#64748b"}]}/>
              <CK checked={r.fu||false} onChange={v=>u({cazResults:{...p.cazResults,[c.k]:{...(p.cazResults?.[c.k]||{}),fu:v}}})} label="F/U" small/>
            </div>
          );
        })}
      </Sec>


      <Sec title="Project Status">
        <Sel label="23. Project Deferred? *" value={a.deferred||""} onChange={v=>sa("deferred",v)} opts={["YES","NO"]}/>
        <div style={{height:8}}/>
        <div><label style={S.fl}>24. Additional Notes</label><textarea style={S.ta} value={a.additionalNotes||""} onChange={e=>sa("additionalNotes",e.target.value)} rows={3} placeholder="Any additional information…"/></div>
        <SigPad label="Assessor Signature" value={a.assessorSig||""} onChange={v=>sa("assessorSig",v)}/>
      </Sec>

      {/* ── PRE-INSTALL PHOTOS ── */}
      <Sec title={<span>Pre-Install Photos <span style={{fontWeight:400,color:"#94a3b8",fontFamily:"'JetBrains Mono',monospace"}}>{preTaken}/{preItems.length}</span></span>}>
        <div style={S.prog}><div style={{...S.progF,width:`${preItems.length?(preTaken/preItems.length)*100:0}%`,background:"linear-gradient(90deg,#6366f1,#a855f7)"}}/></div>
        {preSections.map(([cat,items]) => (
          <div key={cat} style={{marginTop:10}}>
            <div style={{fontSize:11,fontWeight:700,color:"#6366f1",marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>{cat}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:6}}>
              {items.map(item => {
                const arr = getPhotos(p.photos, item.id);
                const has = arr.length > 0;
                return <div key={item.id} style={{background:has?"rgba(34,197,94,.08)":"rgba(255,255,255,.03)",border:`1px solid ${has?"rgba(34,197,94,.3)":"rgba(255,255,255,.08)"}`,borderRadius:8,overflow:"hidden"}}>
                  {has ? <div style={{position:"relative",cursor:"pointer"}} onClick={()=>setPrev({id:item.id,idx:0})}>
                    <img src={arr[0].d} style={{width:"100%",height:70,objectFit:"cover"}} alt=""/>
                    {arr.length>1 && <span style={{position:"absolute",top:2,right:2,background:"rgba(0,0,0,.7)",color:"#fff",fontSize:9,padding:"1px 4px",borderRadius:4}}>{arr.length}</span>}
                  </div> : <div style={{height:70,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <label style={{fontSize:10,color:"#64748b",cursor:"pointer",textAlign:"center",padding:4}}>📸 Tap<input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>handleFile(item.id,e.target.files?.[0])}/></label>
                  </div>}
                  <div style={{padding:"4px 6px",fontSize:9,color:"#94a3b8",borderTop:"1px solid rgba(255,255,255,.05)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span>{item.l}{has&&" ✓"}</span>
                    {has && <label style={{fontSize:10,color:"#818cf8",cursor:"pointer"}}>＋<input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>handleFile(item.id,e.target.files?.[0])}/></label>}
                  </div>
                </div>;
              })}
            </div>
          </div>
        ))}
      </Sec>
    </div>
  );
}

function PhotoTab({p,u,onLog,user,role}) {
  const [prev, setPrev] = useState(null); // {id, idx}
  const [viewMode, setViewMode] = useState("role"); // role | all | compare
  const allItems = Object.entries(PHOTO_SECTIONS).flatMap(([cat,items])=>items.map(i=>({...i,cat})));
  const preSections = Object.entries(PHOTO_SECTIONS).filter(([cat]) => cat.includes("(Pre)"));
  const postSections = Object.entries(PHOTO_SECTIONS).filter(([cat]) => cat.includes("(Post)"));
  const preItems = preSections.flatMap(([,items])=>items);
  const postItems = postSections.flatMap(([,items])=>items);
  const preTaken = preItems.filter(i=>hasPhoto(p.photos,i.id)).length;
  const postTaken = postItems.filter(i=>hasPhoto(p.photos,i.id)).length;
  const totalTaken = preTaken + postTaken;

  const compressAndSave = (id, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (file.type === "image/gif") {
        const existing = getPhotos(p.photos, id);
        const newEntry = {d:e.target.result,at:new Date().toISOString(),by:user};
        u({photos:{...p.photos,[id]:[...existing, newEntry]}});
        const it = allItems.find(x=>x.id===id);
        onLog(`📸 ${it?.l||id} (${existing.length+1})`);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const maxW = 1600;
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        const compressed = c.toDataURL("image/jpeg", 0.7);
        const existing = getPhotos(p.photos, id);
        const newEntry = {d:compressed,at:new Date().toISOString(),by:user};
        u({photos:{...p.photos,[id]:[...existing, newEntry]}});
        const it = allItems.find(x=>x.id===id);
        onLog(`📸 ${it?.l||id} (${existing.length+1})`);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const deletePhoto = (id, idx) => {
    const arr = getPhotos(p.photos, id).filter((_,i)=>i!==idx);
    const it = allItems.find(x=>x.id===id);
    u({photos:{...p.photos,[id]:arr.length?arr:undefined}});
    onLog(`🗑️ Removed ${it?.l||id}`);
    setPrev(null);
  };

  // Preview overlay
  if (prev) {
    const arr = getPhotos(p.photos, prev.id);
    const ph = arr[prev.idx];
    const it = allItems.find(x=>x.id===prev.id);
    return (
      <div style={S.camOv}>
        <div style={S.camH}>
          <button style={{...S.back,fontSize:18}} onClick={()=>setPrev(null)}>← Back</button>
          <div style={{flex:1,textAlign:"center",fontWeight:600,fontSize:14}}>{it?.l} {arr.length>1?`(${prev.idx+1}/${arr.length})`:""}</div>
          <button style={{...S.ghost,color:"#ef4444",borderColor:"#ef4444",padding:"4px 10px"}} onClick={()=>deletePhoto(prev.id,prev.idx)}>Delete</button>
        </div>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:"#000",padding:8,position:"relative"}}>
          {ph?.d && <img src={ph.d} style={{maxWidth:"100%",maxHeight:"80vh",borderRadius:8}} alt=""/>}
          {arr.length > 1 && prev.idx > 0 && <button onClick={()=>setPrev({...prev,idx:prev.idx-1})} style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,.5)",color:"#fff",border:"none",borderRadius:"50%",width:36,height:36,fontSize:18,cursor:"pointer"}}>‹</button>}
          {arr.length > 1 && prev.idx < arr.length-1 && <button onClick={()=>setPrev({...prev,idx:prev.idx+1})} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,.5)",color:"#fff",border:"none",borderRadius:"50%",width:36,height:36,fontSize:18,cursor:"pointer"}}>›</button>}
        </div>
        <div style={{padding:12,textAlign:"center",fontSize:11,color:"#94a3b8"}}>{ph?.by} · {ph?.at&&new Date(ph.at).toLocaleString()}</div>
      </div>
    );
  }

  // ── Photo row helper ──
  const PhotoRow = ({it}) => {
    const arr = getPhotos(p.photos, it.id);
    const has = arr.length > 0;
    return (
      <div style={S.phRow}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,color:has?"#22c55e":"#cbd5e1"}}>{has?"✓":"○"} {it.l} {arr.length>1?<span style={{fontSize:10,color:"#818cf8"}}>({arr.length})</span>:""}</div>
          <div style={{fontSize:10,color:"#64748b"}}>{it.p==="pre"?"📋 Pre":"🏗️ Post"}{has&&arr[0].by?` · ${arr[0].by}`:""}</div>
        </div>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          {arr.map((ph,idx) => <button key={idx} style={S.thBtn} onClick={()=>setPrev({id:it.id,idx})}><img src={ph.d} style={S.th} alt=""/></button>)}
          <label style={S.cBtn} title={has?"Add another":"Take photo"}>
            {has?"＋":"📷"}
            <input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>{compressAndSave(it.id,e.target.files?.[0]);e.target.value="";}}/>
          </label>
          <label style={S.uBtn} title="Upload from gallery">
            📁
            <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{compressAndSave(it.id,e.target.files?.[0]);e.target.value="";}}/>
          </label>
        </div>
      </div>
    );
  };

  // ── Side-by-side comparison pairs ──
  const buildPairs = () => {
    const pairs = [];
    const usedPost = new Set();
    preSections.forEach(([preCat, preItms]) => {
      const catBase = preCat.replace(/ \(Pre\)| \(Post\)/g,"");
      const postMatch = postSections.find(([postCat]) => postCat.replace(/ \(Pre\)| \(Post\)/g,"") === catBase);
      preItms.forEach(preIt => {
        const preArr = getPhotos(p.photos, preIt.id);
        // find best post match: same base label or just first in matching category
        let postIt = null;
        if (postMatch) {
          postIt = postMatch[1].find(po => !usedPost.has(po.id) && hasPhoto(p.photos, po.id));
          if (postIt) usedPost.add(postIt.id);
        }
        if (preArr.length > 0 || postIt) {
          pairs.push({ preCat: catBase, preIt, postIt, preArr, postArr: postIt ? getPhotos(p.photos, postIt.id) : [] });
        }
      });
    });
    // Remaining post photos with no pre match
    postSections.forEach(([postCat, postItms]) => {
      postItms.filter(po => !usedPost.has(po.id) && hasPhoto(p.photos, po.id)).forEach(po => {
        usedPost.add(po.id);
        pairs.push({ preCat: postCat.replace(/ \(Pre\)| \(Post\)/g,""), preIt: null, postIt: po, preArr: [], postArr: getPhotos(p.photos, po.id) });
      });
    });
    return pairs;
  };

  // ── Tab button style ──
  const tabBtn = (mode, label, icon) => ({
    flex:1,padding:"8px 4px",borderRadius:6,border:`1px solid ${viewMode===mode?"rgba(99,102,241,.5)":"rgba(255,255,255,.1)"}`,
    background:viewMode===mode?"rgba(99,102,241,.15)":"transparent",color:viewMode===mode?"#a5b4fc":"#64748b",
    fontSize:11,fontWeight:viewMode===mode?700:500,cursor:"pointer",textAlign:"center",fontFamily:"'DM Sans',sans-serif"
  });

  return (
    <div>
      {/* ── HEADER ── */}
      <Sec title={<span>Photos <span style={{fontWeight:400,color:"#94a3b8",fontFamily:"'JetBrains Mono',monospace"}}>{totalTaken}/{allItems.length}</span></span>}>
        <div style={S.prog}><div style={{...S.progF,width:`${allItems.length?(totalTaken/allItems.length)*100:0}%`,background:"linear-gradient(90deg,#6366f1,#a855f7)"}}/></div>

        {/* View mode toggle */}
        <div style={{display:"flex",gap:4,marginTop:10}}>
          <button type="button" onClick={()=>setViewMode("role")} style={tabBtn("role")}>📋 By Role</button>
          <button type="button" onClick={()=>setViewMode("all")} style={tabBtn("all")}>📂 All</button>
          <button type="button" onClick={()=>setViewMode("compare")} style={tabBtn("compare")}>↔ Side-by-Side</button>
        </div>

        {/* Print / Compile buttons */}
        <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
          <PrintBtn label="Print Pre" onClick={()=>savePrint(photoPageHTML("Pre-Install Photos",p.photos,allItems.filter(i=>i.p==="pre"),p))}/>
          <PrintBtn label="Print Post" onClick={()=>savePrint(photoPageHTML("Post-Install Photos",p.photos,allItems.filter(i=>i.p==="post"),p))}/>
          <PrintBtn label="Print Side-by-Side" onClick={()=>savePrint(sideBySideHTML(p.photos,allItems,p))}/>
          <PrintBtn label="Print All" onClick={()=>savePrint(photoPageHTML("All Photos — Complete",p.photos,allItems,p))}/>
        </div>
      </Sec>

      {/* ═══ VIEW: BY ROLE ═══ */}
      {viewMode === "role" && <>
        {/* ASSESSOR — Pre Photos */}
        <Sec title={<span style={{color:"#6366f1"}}>📋 Assessor — Pre-Install <span style={{fontWeight:400,color:"#94a3b8",fontFamily:"'JetBrains Mono',monospace"}}>{preTaken}/{preItems.length}</span></span>}>
          <div style={S.prog}><div style={{...S.progF,width:`${preItems.length?(preTaken/preItems.length)*100:0}%`,background:"linear-gradient(90deg,#6366f1,#a855f7)"}}/></div>
          {preSections.map(([cat,items]) => {
            const cd = items.filter(i=>hasPhoto(p.photos,i.id)).length;
            return (
              <div key={cat} style={{marginTop:10}}>
                <div style={{fontSize:11,fontWeight:700,color:"#6366f1",marginBottom:4,display:"flex",justifyContent:"space-between"}}>
                  <span>{cat}</span><span style={{color:cd===items.length?"#22c55e":"#64748b"}}>{cd}/{items.length}</span>
                </div>
                {items.map(it => <PhotoRow key={it.id} it={it}/>)}
              </div>
            );
          })}
        </Sec>

        {/* INSTALL CREW — Post Photos */}
        <Sec title={<span style={{color:"#f97316"}}>🏗️ Install Crew — Post-Install <span style={{fontWeight:400,color:"#94a3b8",fontFamily:"'JetBrains Mono',monospace"}}>{postTaken}/{postItems.length}</span></span>}>
          <div style={S.prog}><div style={{...S.progF,width:`${postItems.length?(postTaken/postItems.length)*100:0}%`,background:"linear-gradient(90deg,#f97316,#eab308)"}}/></div>
          {postSections.map(([cat,items]) => {
            const cd = items.filter(i=>hasPhoto(p.photos,i.id)).length;
            return (
              <div key={cat} style={{marginTop:10}}>
                <div style={{fontSize:11,fontWeight:700,color:"#f97316",marginBottom:4,display:"flex",justifyContent:"space-between"}}>
                  <span>{cat}</span><span style={{color:cd===items.length?"#22c55e":"#64748b"}}>{cd}/{items.length}</span>
                </div>
                {items.map(it => <PhotoRow key={it.id} it={it}/>)}
              </div>
            );
          })}
        </Sec>
      </>}

      {/* ═══ VIEW: ALL ═══ */}
      {viewMode === "all" && Object.entries(PHOTO_SECTIONS).map(([cat,items]) => {
        const cd = items.filter(i=>hasPhoto(p.photos,i.id)).length;
        return (
          <Sec key={cat} title={<span>{cat} <span style={{fontWeight:400,color:cd===items.length?"#22c55e":"#94a3b8"}}>{cd}/{items.length}</span></span>}>
            {items.map(it => <PhotoRow key={it.id} it={it}/>)}
          </Sec>
        );
      })}

      {/* ═══ VIEW: SIDE-BY-SIDE ═══ */}
      {viewMode === "compare" && (() => {
        const pairs = buildPairs();
        if (pairs.length === 0) return <Sec title="Side-by-Side Comparison"><p style={{color:"#64748b",fontSize:12,textAlign:"center",padding:20}}>No photos to compare yet. Take pre and post photos to see side-by-side.</p></Sec>;
        // Group by category
        const grouped = {};
        pairs.forEach(pr => { if (!grouped[pr.preCat]) grouped[pr.preCat] = []; grouped[pr.preCat].push(pr); });
        return Object.entries(grouped).map(([catBase, catPairs]) => (
          <Sec key={catBase} title={<span>↔ {catBase}</span>}>
            {catPairs.map((pr, pi) => (
              <div key={pi} style={{marginBottom:12,border:"1px solid rgba(255,255,255,.08)",borderRadius:8,overflow:"hidden"}}>
                {/* Labels */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
                  <div style={{padding:"6px 8px",background:"rgba(99,102,241,.08)",fontSize:10,fontWeight:700,color:"#818cf8",textAlign:"center"}}>
                    📋 PRE — {pr.preIt?.l || "—"}
                  </div>
                  <div style={{padding:"6px 8px",background:"rgba(249,115,22,.08)",fontSize:10,fontWeight:700,color:"#f97316",textAlign:"center"}}>
                    🏗️ POST — {pr.postIt?.l || "—"}
                  </div>
                </div>
                {/* Images */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",minHeight:100}}>
                  {/* Pre side */}
                  <div style={{borderRight:"1px solid rgba(255,255,255,.06)",padding:4,display:"flex",flexDirection:"column",gap:4,alignItems:"center",justifyContent:"center"}}>
                    {pr.preArr.length > 0 ? pr.preArr.map((ph,idx) => (
                      <button key={idx} onClick={()=>setPrev({id:pr.preIt.id,idx})} style={{background:"none",border:"none",padding:0,cursor:"pointer",width:"100%"}}>
                        <img src={ph.d} style={{width:"100%",maxHeight:200,objectFit:"contain",borderRadius:4}} alt=""/>
                      </button>
                    )) : <div style={{color:"#475569",fontSize:11,padding:20}}>No pre photo</div>}
                  </div>
                  {/* Post side */}
                  <div style={{padding:4,display:"flex",flexDirection:"column",gap:4,alignItems:"center",justifyContent:"center"}}>
                    {pr.postArr.length > 0 ? pr.postArr.map((ph,idx) => (
                      <button key={idx} onClick={()=>setPrev({id:pr.postIt.id,idx})} style={{background:"none",border:"none",padding:0,cursor:"pointer",width:"100%"}}>
                        <img src={ph.d} style={{width:"100%",maxHeight:200,objectFit:"contain",borderRadius:4}} alt=""/>
                      </button>
                    )) : <div style={{color:"#475569",fontSize:11,padding:20}}>No post photo</div>}
                  </div>
                </div>
                {/* Metadata */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderTop:"1px solid rgba(255,255,255,.04)",fontSize:9,color:"#475569"}}>
                  <div style={{padding:"3px 8px"}}>{pr.preArr[0]?.by||""}{pr.preArr[0]?.at?` · ${new Date(pr.preArr[0].at).toLocaleDateString()}`:""}</div>
                  <div style={{padding:"3px 8px"}}>{pr.postArr[0]?.by||""}{pr.postArr[0]?.at?` · ${new Date(pr.postArr[0].at).toLocaleDateString()}`:""}</div>
                </div>
              </div>
            ))}
          </Sec>
        ));
      })()}
    </div>
  );
}

function ScopeTab({p,u,onLog}) {
  const s = p.scope2026 || {};
  const a = p.audit || {};
  const ss = (k,v) => u({scope2026:{...s,[k]:v}});
  const sn = (sec,k,v) => u({scope2026:{...s,[sec]:{...(s[sec]||{}),[k]:v}}});
  const tog = (list,m) => { const l = p[list].includes(m) ? p[list].filter(x=>x!==m) : [...p[list],m]; u({[list]:l}); };

  // Auto-fill scope from assessment (only empty fields)
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    if (filled || !a) return;
    const updates = {};
    const nested = {};
    // Roof age
    if (!s.roofAge && a.roofAge) updates.roofAge = a.roofAge;
    // Tenant type (map: Owned→Own, Rented→Rent)
    if (!s.tenantType && a.tenantType) updates.tenantType = a.tenantType === "Owned" ? "Own" : a.tenantType === "Rented" ? "Rent" : a.tenantType;
    // Thermostat (map: Non-programmable→Manual)
    if (!s.htg?.thermostat && a.thermostatType) {
      nested.htg = {...(s.htg||{}), thermostat: a.thermostatType === "Non-programmable" ? "Manual" : a.thermostatType};
    }
    // Ceiling / wall conditions
    if (!s.ceilingCond && a.ceilingCond) updates.ceilingCond = a.ceilingCond;
    if (!s.wallCond && a.wallCond) updates.wallCond = a.wallCond;
    if (!s.wallsNeedInsul && a.wallsNeedInsul) updates.wallsNeedInsul = a.wallsNeedInsul;
    // Fan flows → ASHRAE
    const ash = s.ashrae || {};
    const ashUp = {};
    if (!ash.bath1CFM && a.bathFan1) ashUp.bath1CFM = a.bathFan1;
    if (!ash.bath2CFM && a.bathFan2) ashUp.bath2CFM = a.bathFan2;
    if (!ash.bath3CFM && a.bathFan3) ashUp.bath3CFM = a.bathFan3;
    if (!ash.kitchenCFM && a.kitchenFan) ashUp.kitchenCFM = a.kitchenFan;
    if (Object.keys(ashUp).length) nested.ashrae = {...ash, ...ashUp};
    // Smoke / CO
    if (!s.smokePresent && a.smokePresent) updates.smokePresent = a.smokePresent;
    if (!s.smokeNeeded && a.smokeNeeded) updates.smokeNeeded = a.smokeNeeded;
    if (!s.coPresent && a.coPresent) updates.coPresent = a.coPresent;
    if (!s.coNeeded && a.coNeeded) updates.coNeeded = a.coNeeded;
    // Weatherization
    if (!s.tenmats && a.tenmats) updates.tenmats = a.tenmats;
    if (!s.doorSweeps && a.doorSweeps) updates.doorSweeps = a.doorSweeps;
    // Occupants (shared on p)
    if (!p.occupants && a.occupants) u({occupants: a.occupants});

    if (Object.keys(updates).length || Object.keys(nested).length) {
      u({scope2026:{...s, ...updates, ...nested}});
    }
    setFilled(true);
  }, []);

  const getScopeHTML = () => {
    const yn = v => v===true?"Yes":v===false?"No":"—";
    const v = k => s[k]||"—";
    const nv = (sec,k) => s[sec]?.[k]||"—";
    const nyn = (sec,k) => s[sec]?.[k]===true?"Yes":s[sec]?.[k]===false?"No":"—";

    const mq = p.measureQty||{};
    const measTable = p.measures.length ? `<table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:4px">\n<tr style="background:#f0fdf4;"><th style="text-align:left;padding:3px 6px;border:1px solid #ccc">Measure</th><th style="text-align:right;padding:3px 6px;border:1px solid #ccc">Qty</th><th style="text-align:left;padding:3px 6px;border:1px solid #ccc">Unit</th></tr>\n${p.measures.map(m=>`<tr><td style="padding:3px 6px;border:1px solid #ddd">${m}</td><td style="text-align:right;padding:3px 6px;border:1px solid #ddd">${getResolvedQty(p,m)||"—"}</td><td style="padding:3px 6px;border:1px solid #ddd">${measUnit(m)}</td></tr>`).join("")}\n</table>` : "<span style='color:#999'>None selected</span>";
    const hsTable = p.healthSafety.length ? `<table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:4px">\n<tr style="background:#fffbeb;"><th style="text-align:left;padding:3px 6px;border:1px solid #ccc">Measure</th><th style="text-align:right;padding:3px 6px;border:1px solid #ccc">Qty</th><th style="text-align:left;padding:3px 6px;border:1px solid #ccc">Unit</th></tr>\n${p.healthSafety.map(m=>`<tr><td style="padding:3px 6px;border:1px solid #ddd">${m}</td><td style="text-align:right;padding:3px 6px;border:1px solid #ddd">${getResolvedQty(p,m)||"—"}</td><td style="padding:3px 6px;border:1px solid #ddd">ea</td></tr>`).join("")}\n</table>` : "<span style='color:#999'>None selected</span>";

    const chk = b => b===true?"☑":b===false?"☐":"—";
    const htg = s.htg||{}; const clg = s.clg||{}; const dhw = s.dhw||{};
    const int2 = s.int||{}; const exh = s.exh||{}; const att = s.attic||{};
    const col = s.collar||{}; const oc = s.outerCeiling||{}; const kw = s.kneeWall||{};
    const ew1 = s.extWall1||{}; const ew2 = s.extWall2||{}; const fnd = s.fnd||{};
    const afue = htg.btuIn && htg.btuOut ? (Number(htg.btuOut)/Number(htg.btuIn)*100).toFixed(1)+"%" : "—";

    // Build ASHRAE HTML first (avoid nested template literals)
    const ashraeHTML = (() => {
      const a2=p.audit||{};const baseSq=Number(p.sqft)||0;const finBsmt=s.fnd?.type==="Finished"?(Number(s.fnd?.aboveSqft)||0)+(Number(s.fnd?.belowSqft)||0):0;const sq=baseSq+finBsmt;const oc2=Number(s.bedrooms)||0;const c50=Number(p.preCFM50)||0;
      const st2=Number(p.stories)||1;const hh=st2>=2?16:st2>=1.5?14:8;const wsf2=0.56;
      const kRw=String(s.ashrae?.kitchenCFM??a2.kitchenFan??"");const b1Rw=String(s.ashrae?.bath1CFM??a2.bathFan1??"");
      const b2Rw=String(s.ashrae?.bath2CFM??a2.bathFan2??"");const b3Rw=String(s.ashrae?.bath3CFM??a2.bathFan3??"");
      const kP=kRw.trim()!=="";const b1P=b1Rw.trim()!=="";const b2P=b2Rw.trim()!=="";const b3P=b3Rw.trim()!=="";
      const kC=Number(kRw)||0;const b1c=Number(b1Rw)||0;const b2c=Number(b2Rw)||0;const b3c=Number(b3Rw)||0;
      const kW=s.ashrae?.kWin;const b1W=s.ashrae?.b1Win;const b2W=s.ashrae?.b2Win;const b3W=s.ashrae?.b3Win;
      const qi=c50>0?0.052*c50*wsf2*Math.pow(hh/8.2,0.4):0;
      const qt=sq>0?0.03*sq+7.5*(oc2+1):0;
      const kD=kP?Math.max(0,100-(kW?20:kC)):0;const b1D=b1P?Math.max(0,50-(b1W?20:b1c)):0;
      const b2D=b2P?Math.max(0,50-(b2W?20:b2c)):0;const b3D=b3P?Math.max(0,50-(b3W?20:b3c)):0;
      const td=kD+b1D+b2D+b3D;const supp=td*0.25;
      const qf=qt+supp-qi;
      const R2=vv=>Math.round(vv*100)/100;
      const fan=Number(s.ashrae?.fanSetting)||0;const minHr=fan>0?R2(qf/fan*60):0;
      let h = "";
      h += '<div class="grid">';
      h += '<div class="row"><span class="lbl">Floor area'+(finBsmt>0?" (incl. fin. bsmt)":"")+'</span><span class="val">'+sq+' ft\u00b2</span></div>';
      h += '<div class="row"><span class="lbl">Nbr (bedrooms)</span><span class="val">'+oc2+'</span></div>';
      h += '<div class="row"><span class="lbl">Occupants (Nbr + 1)</span><span class="val">'+(oc2+1)+'</span></div>';
      h += '<div class="row"><span class="lbl">Dwelling height</span><span class="val">'+hh+' ft ('+(st2>=2?"2":st2>=1.5?"1.5":"1")+'-story)</span></div>';
      h += '<div class="row"><span class="lbl">Leakage @ 50Pa</span><span class="val">'+c50+' CFM</span></div>';
      h += '<div class="row"><span class="lbl">Kitchen fan'+(kP?"":" (none)")+'</span><span class="val">'+(kP?kC+" CFM":"\u2014")+' '+(kW?"(window)":"")+" "+(kP?"(req 100)":"")+'</span></div>';
      h += '<div class="row"><span class="lbl">Bath #1'+(b1P?"":" (none)")+'</span><span class="val">'+(b1P?b1c+" CFM":"\u2014")+' '+(b1W?"(window)":"")+" "+(b1P?"(req 50)":"")+'</span></div>';
      h += '<div class="row"><span class="lbl">Bath #2'+(b2P?"":" (none)")+'</span><span class="val">'+(b2P?b2c+" CFM":"\u2014")+' '+(b2W?"(window)":"")+" "+(b2P?"(req 50)":"")+'</span></div>';
      h += '<div class="row"><span class="lbl">Bath #3'+(b3P?"":" (none)")+'</span><span class="val">'+(b3P?b3c+" CFM":"\u2014")+' '+(b3W?"(window)":"")+" "+(b3P?"(req 50)":"")+'</span></div>';
      h += '<div class="row"><span class="lbl">Total deficit (intermittent)</span><span class="val">'+Math.round(td)+' CFM</span></div>';
      h += '</div>';
      h += '<div style="margin-top:8px;padding:8px;background:#f0f0ff;border-radius:4px">';
      h += '<div style="font-weight:700;font-size:11px;color:#4338ca;margin-bottom:4px">Dwelling-Unit Ventilation Results</div>';
      h += '<div class="row"><span class="lbl">Eff. annual avg infiltration</span><span class="val">'+R2(qi)+' CFM</span></div>';
      h += '<div class="row"><span class="lbl">Qtot = 0.03\u00d7'+sq+' + 7.5\u00d7('+oc2+'+1)</span><span class="val">'+R2(qt)+' CFM</span></div>';
      h += '<div class="row"><span class="lbl">Alt. compliance supplement = '+Math.round(td)+'\u00d70.25</span><span class="val">'+R2(supp)+' CFM</span></div>';
      h += '<div class="row"><span class="lbl">Infiltration credit (full, existing)</span><span class="val">'+R2(qi)+' CFM</span></div>';
      h += '<div class="row" style="border-top:2px solid #4338ca;padding-top:4px;margin-top:4px"><span style="font-weight:700">Qfan = '+R2(qt)+' + '+R2(supp)+' \u2212 '+R2(qi)+'</span><span style="font-weight:700;color:#4338ca;font-size:14px">'+R2(qf)+' CFM</span></div>';
      if(fan>0) h += '<div class="row"><span class="lbl">Fan setting: '+fan+' CFM \u00b7 Run-time: '+minHr+' min/hr (continuous = 60)</span></div>';
      h += '</div>';
      return h;
    })();

    // Build body with string concatenation (no nested template literals)
    let body = "";
    const R = (l, vv) => '<div class="row"><span class="lbl">'+l+'</span><span class="val">'+(vv!=null?vv:"\u2014")+'</span></div>';

    body += '<div class="sec"><h3>Customer Information</h3><div class="grid">';
    body += R("Customer",p.customerName) + R("Address",p.address) + R("RISE ID",p.riseId||"\u2014");
    body += R("Assessment Date",p.assessmentDate?fmts(p.assessmentDate):"\u2014");
    body += R("Sq Ft",p.sqft||"\u2014") + R("Volume",Number(p.sqft)?(Number(p.sqft)*8).toLocaleString()+" ft\u00b3":"\u2014");
    body += R("Stories",p.stories||"\u2014") + R("Bedrooms",s.bedrooms||"\u2014");
    body += R("Year Built",p.yearBuilt||"\u2014") + R("Home Age",p.yearBuilt?(new Date().getFullYear()-Number(p.yearBuilt))+" yrs":"\u2014");
    body += R("Occupants",p.occupants||"\u2014");
    body += '</div></div>';

    body += '<div class="sec"><h3>Building Property Type</h3><div class="grid">';
    body += R("Style",v("style")) + R("Tenant Type",v("tenantType"));
    body += R("Gutters Exist",chk(s.gutterExist)) + R("Downspouts",chk(s.downspouts)) + R("Gutter Repairs",chk(s.gutterRepair));
    body += R("Roof Condition",v("roofCondition")) + R("Roof Type",v("roofType")) + R("Roof Age",v("roofAge")) + R("Roof Repairs",chk(s.roofRepair));
    body += '</div></div>';

    body += '<div class="sec"><h3>Interior Conditions</h3><div class="grid">';
    body += R("Ceiling Condition",v("ceilingCond")) + R("Wall Condition",v("wallCond")) + R("Walls Need Insulation",v("wallsNeedInsul"));
    body += '</div></div>';

    body += '<div class="sec"><h3>Smoke / CO / Weatherization</h3><div class="grid">';
    body += R("Smoke \u2014 present",v("smokePresent")) + R("Smoke \u2014 to install",v("smokeNeeded"));
    body += R("CO \u2014 present",v("coPresent")) + R("CO \u2014 to install",v("coNeeded"));
    body += R("Tenmats Needed",v("tenmats")) + R("Doors Need Sweeps/WS",v("doorSweeps"));
    body += '</div></div>';

    body += '<div class="sec"><h3>Heating System Info</h3><div class="grid">';
    body += R("Thermostat",htg.thermostat||"\u2014") + R("Fuel Type",htg.fuel||"\u2014") + R("System Type",htg.system||"\u2014") + R("Flue Condition",htg.flue||"\u2014");
    body += R("Manufacturer",htg.mfg||"\u2014") + R("Install Year",htg.year||"\u2014") + R("Age",htg.year?(new Date().getFullYear()-Number(htg.year))+" yrs":"\u2014") + R("Condition",htg.condition||"\u2014");
    body += R("BTU Input",htg.btuIn||"\u2014") + R("BTU Output",htg.btuOut||"\u2014") + R("AFUE",afue) + R("Draft",htg.draft||"\u2014");
    body += R("Gas Shut Off",chk(htg.gasShutoff)) + R("Pipes Asbestos Wrapped",chk(htg.asbestosPipes)) + R("Replacement Recommended",chk(htg.replaceRec)) + R("Clean & Tune",chk(htg.cleanTune||htg.cleanTuneOverride));
    body += '</div>'+(htg.notes?'<p style="color:#333;margin-top:6px">Notes: '+htg.notes+'</p>':"")+'</div>';

    body += '<div class="sec"><h3>Cooling System Info</h3><div class="grid">';
    body += R("Type",clg.type||"\u2014") + R("Manufacturer",clg.mfg||"\u2014") + R("Install Year",clg.year||"\u2014");
    body += R("Age",clg.year?(new Date().getFullYear()-Number(clg.year))+" yrs":"\u2014") + R("SEER",clg.seer||"\u2014") + R("Condition",clg.condition||"\u2014");
    body += R("BTU Size",clg.btu||"\u2014") + R("Replacement Recommended",chk(clg.replaceRec));
    if(clg.replaceReason) body += R("Reason",clg.replaceReason);
    body += '</div></div>';

    body += '<div class="sec"><h3>Domestic Hot Water Info</h3><div class="grid">';
    body += R("Fuel",dhw.fuel||"\u2014") + R("System Type",dhw.system||"\u2014") + R("Manufacturer",dhw.mfg||"\u2014");
    body += R("Install Year",dhw.year||"\u2014") + R("Age",dhw.year?(new Date().getFullYear()-Number(dhw.year))+" yrs":"\u2014") + R("Condition",dhw.condition||"\u2014");
    body += R("Input BTU",dhw.btuIn||"\u2014") + R("Insulated Pipes",chk(dhw.insulPipes)) + R("Flue Repair Needed",chk(dhw.flueRepair));
    body += R("Replacement Recommended",chk(dhw.replaceRec)) + R("Ducts Need Sealing",chk(dhw.ductsSealed));
    if(dhw.replaceReason) body += R("Reason",dhw.replaceReason);
    body += '</div></div>';

    body += '<div class="sec"><h3>Interior Inspection</h3><div class="grid">';
    body += R("Mold",chk(int2.mold)) + R("Moisture Problems",chk(int2.moisture)) + R("Live Knob & Tube",chk(int2.knobTube)) + R("Electrical Issues",chk(int2.electrical));
    body += R("Broken Glass",chk(int2.brokenGlass)) + R("Vermiculite/Asbestos",chk(int2.vermiculite)) + R("Water Leaks",chk(int2.waterLeaks)) + R("Roof Leaks",chk(int2.roofLeaks));
    if(int2.waterLoc) body += R("Water Leak Location",int2.waterLoc);
    if(int2.roofLoc) body += R("Roof Leak Location",int2.roofLoc);
    body += R("Ceiling Condition",int2.ceiling||"\u2014") + R("Wall Condition",int2.wall||"\u2014");
    body += R("Dropped Ceiling",chk(int2.droppedCeiling)) + R("Drywall Repair",chk(int2.drywallRepair)) + R("Recessed Lighting",chk(int2.recessedLight));
    if(int2.recessedLoc) body += R("Recessed Loc",int2.recessedLoc);
    body += R("CO Detector",chk(int2.coDetector)) + R("Smoke Detector",chk(int2.smokeDetector));
    body += '</div></div>';

    body += '<div class="sec"><h3>Door Types / Exhaust Venting</h3><div class="grid">';
    body += R("Front \u2014 Existing",chk(s.doors?.Front)) + R("Back \u2014 Existing",chk(s.doors?.Back)) + R("Basement \u2014 Existing",chk(s.doors?.Basement)) + R("Attic \u2014 Existing",chk(s.doors?.Attic));
    body += R("Strips/Sweeps Needed",s.totalSweeps||"\u2014");
    body += R("Exhaust Fan Replace",chk(exh.fanReplace)) + R("Bath Fan w/ Light",chk(exh.bathFanLight)) + R("Vent Kit Needed",chk(exh.ventKit));
    body += R("Termination Cap",chk(exh.termCap)) + R("Dryer Vented Properly",chk(exh.dryerProper)) + R("Dryer Vent Repair",chk(exh.dryerRepair));
    body += R("BD In",exh.bdIn||"\u2014") + R("BD Out",exh.bdOut||"\u2014") + R("No BD (estimated)",chk(exh.noBD));
    body += '</div>'+(exh.notes?'<p style="color:#333;margin-top:6px">Notes: '+exh.notes+'</p>':"")+'</div>';

    body += '<div class="sec"><h3>Attic</h3><div class="grid">';
    body += R("Finished",chk(att.finished)) + R("Unfinished",chk(att.unfinished)) + R("Flat",chk(att.flat));
    body += R("Sq Ft",nv("attic","sqft")) + R("Pre-Existing R",nv("attic","preR")) + R("R to Add",nv("attic","addR"));
    body += R("Total R",(att.preR||att.addR)?"R-"+(Number(att.preR||0)+Number(att.addR||0)):"\u2014");
    body += R("Recessed Lighting Qty",att.recessQty||"\u2014") + R("Storage Created",att.storage||"\u2014");
    body += R("Ductwork Present",chk(att.ductwork)) + R("Floor Boards",chk(att.floorBoards)) + R("Mold Present",chk(att.moldPresent));
    body += R("Vermiculite Present",chk(att.vermPresent)) + R("Knob & Tube",chk(att.knobTube));
    if(att.ductwork) body += R("Duct Condition",att.condition||"\u2014") + R("Ln Ft Air Seal",att.lnftAirSeal||"\u2014");
    body += R("Existing Ventilation",att.existVent||"\u2014") + R("Needed Ventilation",att.needVent||"\u2014") + R("Access Location",att.accessLoc||"\u2014");
    body += '</div>'+(att.notes?'<p style="color:#333;margin-top:6px">Notes: '+att.notes+'</p>':"")+'</div>';

    body += '<div class="sec"><h3>Collar Beam</h3><div class="grid">';
    body += R("Sq Ft",col.sqft||"\u2014") + R("Pre-Existing R",col.preR||"\u2014") + R("R to Add",col.addR||"\u2014");
    body += R("Total R",(col.preR||col.addR)?"R-"+(Number(col.preR||0)+Number(col.addR||0)):"\u2014");
    body += R("Accessible",chk(col.accessible)) + R("Cut In Needed",chk(col.cutIn)) + R("Ductwork",chk(col.ductwork));
    if(col.ductwork) body += R("Condition",col.condition||"\u2014") + R("Ln Ft Air Seal",col.lnftAirSeal||"\u2014");
    body += '</div></div>';

    body += '<div class="sec"><h3>Outer Ceiling Joists</h3><div class="grid">';
    body += R("Sq Ft",nv("outerCeiling","sqft")) + R("Pre-Existing R",nv("outerCeiling","preR")) + R("R to Add",nv("outerCeiling","addR"));
    body += R("Accessible",chk(oc.accessible)) + R("Cut In",chk(oc.cutIn)) + R("Floor Boards",chk(oc.floorBoards)) + R("Ductwork",chk(oc.ductwork));
    if(oc.ductwork) body += R("Condition",oc.condition||"\u2014") + R("Ln Ft Air Seal",oc.lnftAirSeal||"\u2014");
    body += '</div></div>';

    body += '<div class="sec"><h3>Knee Walls</h3><div class="grid">';
    body += R("Sq Ft",nv("kneeWall","sqft")) + R("Pre-Existing R",nv("kneeWall","preR")) + R("R to Add",nv("kneeWall","addR"));
    body += R("Dense Pack",nyn("kneeWall","densePack")) + R("Rigid Foam",nyn("kneeWall","rigidFoam")) + R("Tyvek",nyn("kneeWall","tyvek"));
    body += R("Fiberglass Batts",nyn("kneeWall","fgBatts")) + R("Wall Type",nv("kneeWall","wallType"));
    if(kw.tyvek) body += R("Tyvek Sq Ft",kw.tyvekSqft||"\u2014");
    body += '</div></div>';

    body += '<div class="sec"><h3>Exterior Walls \u2014 1st Floor</h3><div class="grid">';
    body += R("Sq Ft",nv("extWall1","sqft")) + R("Pre-Existing R",nv("extWall1","preR")) + R("R to Add",nv("extWall1","addR"));
    body += R("Window/Door SqFt",ew1.sqft?Math.round(Number(ew1.sqft)*0.16):"\u2014") + R("Net Insulation SqFt",ew1.sqft?Math.round(Number(ew1.sqft)*0.84):"\u2014");
    body += R("Dense Pack",nyn("extWall1","densePack")) + R("Cladding",nv("extWall1","cladding")) + R("Insulate From",nv("extWall1","insulFrom"));
    body += R("Wall Type",nv("extWall1","wallType")) + R("Phenolic Foam",nyn("extWall1","phenolic"));
    body += '</div></div>';

    body += '<div class="sec"><h3>Exterior Walls \u2014 2nd Floor</h3><div class="grid">';
    body += R("Sq Ft",nv("extWall2","sqft")) + R("Pre-Existing R",nv("extWall2","preR")) + R("R to Add",nv("extWall2","addR"));
    body += R("Window/Door SqFt",ew2.sqft?Math.round(Number(ew2.sqft)*0.14):"\u2014") + R("Net Insulation SqFt",ew2.sqft?Math.round(Number(ew2.sqft)*0.86):"\u2014");
    body += R("Dense Pack",nyn("extWall2","densePack")) + R("Cladding",nv("extWall2","cladding"));
    body += '</div></div>';

    body += '<div class="sec"><h3>Foundation / Crawl</h3><div class="grid">';
    body += R("Type",nv("fnd","type")) + R("Above Grade SqFt",nv("fnd","aboveSqft")) + R("Below Grade SqFt",nv("fnd","belowSqft"));
    body += R("Pre-Existing R",nv("fnd","preR")) + R("Insulation Type",nv("fnd","insulType"));
    body += R("Band Joist Access",chk(fnd.bandAccess)) + R("Band Joist LnFt",nv("fnd","bandLnft")) + R("Band Joist R",fnd.bandR||"\u2014") + R("Band Insulation",fnd.bandInsul||"\u2014");
    body += R("Vented",chk(fnd.vented)) + R("Vapor Barrier",nyn("fnd","vaporBarrier")) + R("Water Issues",nyn("fnd","waterIssues"));
    body += R("Crawl Ductwork",chk(fnd.crawlDuct)) + R("Crawl Floor",fnd.crawlFloor||"\u2014");
    if(fnd.vented) body += R("# of Vents",fnd.ventCount||"\u2014");
    if(fnd.vaporBarrier) body += R("Barrier SqFt",fnd.barrierSqft||"\u2014");
    body += R("Crawl Above SqFt",fnd.crawlAbove||"\u2014") + R("Crawl Below SqFt",fnd.crawlBelow||"\u2014") + R("Crawl Pre-Existing R",fnd.crawlR||"\u2014");
    body += R("Crawl Band Access",chk(fnd.crawlBandAccess));
    if(fnd.crawlBandAccess) body += R("Crawl Band LnFt",fnd.crawlBandLnft||"\u2014") + R("Crawl Band R",fnd.crawlBandR||"\u2014");
    body += '</div></div>';

    body += '<div class="sec"><h3>Diagnostics</h3><div class="grid">';
    body += R("Pre CFM50",p.preCFM50||"\u2014") + R("Ext Temp",v("extTemp")) + R("BD Location",p.bdLoc||"\u2014");
    body += '</div>'+(s.diagNotes?'<p style="color:#333;margin-top:6px">Notes: '+s.diagNotes+'</p>':"")+'</div>';

    body += '<div class="sec"><h3>ASHRAE 62.2-2016 Ventilation</h3>';
    body += '<p style="font-size:9px;color:#999;margin:0 0 6px">Existing \u00b7 Detached \u00b7 Infiltration credit: Yes \u00b7 Alt. compliance: Yes \u00b7 wsf = 0.56</p>';
    body += ashraeHTML;
    body += '</div>';

    body += '<div class="sec"><h3>Measures \u2014 Energy Efficiency</h3>' + measTable + '</div>';
    body += '<div class="sec"><h3>Measures \u2014 Health & Safety</h3>' + hsTable + '</div>';

    body += '<div class="sec"><h3>Insulation Quantities</h3><div class="grid">';
    ["Attic (0-R11)","Attic (R12-19)","Basement Wall","Crawl Space Wall","Knee Wall","Floor Above Crawl","Rim Joist","Injection Foam Walls"].forEach(function(m) { body += R(m, (s.insulQty?.[m]||"\u2014") + " " + (m.includes("Rim Joist")?"LnFt":"SqFt")); });
    body += '</div></div>';

    body += '<div class="sec"><h3>Notes on Work</h3><p style="color:#333">'+(p.measureNotes||"\u2014")+'</p></div>';
    body += '<div class="sec"><h3>Notes on Health & Safety</h3><p style="color:#333">'+(s.hsNotes||"\u2014")+'</p></div>';



    const html = `<!DOCTYPE html><html><head><title>HEA/IE Retrofit Form — ${p.customerName}</title><style>@page{margin:.4in}body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:16px;font-size:11px}h1{font-size:16px;border-bottom:2px solid #333;padding-bottom:6px}h2{font-size:11px;color:#666;margin-bottom:12px}.sec{margin-bottom:10px;border:1px solid #ddd;border-radius:5px;padding:8px}.sec h3{font-size:12px;margin:0 0 6px;border-bottom:1px solid #eee;padding-bottom:3px}.row{display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid #f5f5f5}.lbl{color:#666}.val{font-weight:600}.grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 16px}</style></head><body>
      <h1>2026 HEA / IE Retrofit Form</h1><h2>${p.customerName} · ${p.address} · RISE: ${p.riseId||"—"} · ${new Date().toLocaleDateString()}</h2>${body}</body></html>`;
    return html;
  };

  return (
    <div id="scope-print-content">
      <Sec title="📋 2026 HEA/IE Retrofit Form">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <p style={{fontSize:11,color:"#94a3b8",margin:0}}>Scope of Work — submit to RISE for approval</p>
          <div style={{display:"flex",gap:6}}>
            <button type="button" style={{...S.ghost,padding:"4px 10px",fontSize:10,color:"#818cf8",borderColor:"rgba(99,102,241,.3)"}} onClick={()=>{
              const conf = confirm("Re-fill empty scope fields from assessment data?");
              if(conf){setFilled(false);}
            }}>↻ Sync from Assessment</button>
            <PrintBtn onClick={()=>printScope(p,s)}/>
          </div>
        </div>
        {!filled && <div style={{fontSize:10,color:"#22c55e",marginTop:4}}>✓ Auto-filled empty fields from assessment data</div>}
      </Sec>

      {/* ══ PAGE 1: BUILDING PROPERTY TYPE ══ */}
      <Sec title="Building Property Type">
        <Gr>
          <Sel label="Style" value={s.style||""} onChange={v=>ss("style",v)} opts={["Single Family, Detached","Townhouse, Single Unit","Duplex, Single Unit","Multi-Family (Any Type), Multiple Units","Mobile Home","Multi-Family 3+ Units, Single Tenant Unit","Condo 3+ Units, Single Unit","Condo 3+ Units, Common Area","2-Flat","Apartment","Manufactured Home"]}/>
          <F label="Year Built" value={p.yearBuilt} onChange={v=>u({yearBuilt:v})} num/>
          <F label="Stories" value={p.stories} onChange={v=>u({stories:v})} num/>
          <F label="Bedrooms" value={s.bedrooms||""} onChange={v=>ss("bedrooms",v)} num/>
          <F label="Occupants" value={p.occupants} onChange={v=>u({occupants:v})} num/>
          <F label="Sq Footage" value={p.sqft} onChange={v=>u({sqft:v})} num/>
          <div style={{display:"flex",flexDirection:"column"}}><label style={S.fl}>Volume</label><div style={{...S.inp,background:"rgba(99,102,241,.08)",color:"#a5b4fc",display:"flex",alignItems:"center",marginTop:"auto"}}>{Number(p.sqft) ? (Number(p.sqft)*8).toLocaleString() : "—"}<span style={{fontSize:10,color:"#64748b",marginLeft:6}}>ft³ (sqft × 8)</span></div></div>
          <F label="Home Age" computed={p.yearBuilt ? (new Date().getFullYear() - Number(p.yearBuilt)) + " yrs" : "—"} suffix="auto"/>
          <Sel label="Tenant Type" value={s.tenantType||""} onChange={v=>ss("tenantType",v)} opts={["Own","Rent"]}/>
        </Gr>
        <div style={{marginTop:8,fontSize:11,fontWeight:600,color:"#818cf8",marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Gutters</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"0px 8px"}}>
          <CK checked={s.gutterExist} onChange={v=>ss("gutterExist",v)} label="Gutters Exist"/>
          <CK checked={s.downspouts} onChange={v=>ss("downspouts",v)} label="Downspouts"/>
          <CK checked={s.gutterRepair} onChange={v=>ss("gutterRepair",v)} label="Repairs Needed"/>
        </div>
        <div style={{marginTop:8,fontSize:11,fontWeight:600,color:"#818cf8",marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Roof</div>
        <Gr>
          <Sel label="Condition" value={s.roofCondition||""} onChange={v=>ss("roofCondition",v)} opts={["Good","Average","Poor"]}/>
          <Sel label="Type" value={s.roofType||""} onChange={v=>ss("roofType",v)} opts={["Architecture","3-Tab","Flat"]}/>
          <F label="Approx. Age" value={s.roofAge||""} onChange={v=>ss("roofAge",v)} num/>
        </Gr>
        <div style={{marginTop:4}}><CK checked={s.roofRepair} onChange={v=>ss("roofRepair",v)} label="Roof Repairs Needed"/></div>
        <div style={{marginTop:4,display:"flex",alignItems:"center",gap:12}}>
          <CK checked={s.highRoofVent} onChange={v=>ss("highRoofVent",v)} label="High Roof Venting"/>
          {s.highRoofVent && <div style={{width:140}}><Sel label="Vent Type" value={s.ventType||""} onChange={v=>ss("ventType",v)} opts={["Static","Ridge"]}/></div>}
        </div>
        <textarea style={{...S.ta,marginTop:8}} value={s.propNotes||""} onChange={e=>ss("propNotes",e.target.value)} rows={2} placeholder="Building property notes…"/>
      </Sec>

      {/* ══ INTERIOR CONDITIONS (from assessment) ══ */}
      <Sec title={<span>Interior Conditions {a.ceilingCond && <span style={{fontSize:9,color:"#818cf8",fontWeight:400}}> · assessment values auto-filled</span>}</span>}>
        <Gr>
          <Sel label="Ceiling Conditions" value={s.ceilingCond||""} onChange={v=>ss("ceilingCond",v)} opts={["Good","Poor"]}/>
          <Sel label="Wall Conditions" value={s.wallCond||""} onChange={v=>ss("wallCond",v)} opts={["Good","Fair","Poor"]}/>
          <Sel label="Walls Need Insulation?" value={s.wallsNeedInsul||""} onChange={v=>ss("wallsNeedInsul",v)} opts={["Yes","No","Other"]}/>
        </Gr>
      </Sec>

      {/* ══ SMOKE / CO / WEATHERIZATION ══ */}
      <Sec title="Smoke / CO / Weatherization">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <F label="Smoke — present" value={s.smokePresent||""} onChange={v=>ss("smokePresent",v)} num/>
          <F label="Smoke — to install" value={s.smokeNeeded||""} onChange={v=>ss("smokeNeeded",v)} num/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:6}}>
          <F label="CO — present" value={s.coPresent||""} onChange={v=>ss("coPresent",v)} num/>
          <F label="CO — to install" value={s.coNeeded||""} onChange={v=>ss("coNeeded",v)} num/>
        </div>
        <div style={{marginTop:8}}><Gr>
          <F label="Tenmats Needed" value={s.tenmats||""} onChange={v=>ss("tenmats",v)} num/>
          <F label="Doors Need Sweeps/WS" value={s.doorSweeps||""} onChange={v=>ss("doorSweeps",v)} num/>
        </Gr></div>
      </Sec>

      {/* ══ PAGE 2: HEATING SYSTEM ══ */}
      <Sec title="Heating System Info">
        <Gr>
          <Sel label="Thermostat" value={s.htg?.thermostat||""} onChange={v=>sn("htg","thermostat",v)} opts={["Manual","Programmable","Smart"]}/>
          <Sel label="Fuel Type" value={s.htg?.fuel||""} onChange={v=>sn("htg","fuel",v)} opts={["Natural Gas","Electric","Propane","Oil","Other"]}/>
          <Sel label="System Type" value={s.htg?.system||""} onChange={v=>sn("htg","system",v)} opts={["Forced Air","Boiler","Other"]}/>
          <Sel label="Flue Condition" value={s.htg?.flue||""} onChange={v=>sn("htg","flue",v)} opts={["Good","Average","Poor"]}/>
        </Gr>
        <div style={{marginTop:8}}><Gr>
          <F label="Manufacturer" value={s.htg?.mfg||""} onChange={v=>sn("htg","mfg",v)}/>
          <F label="Install Year" value={s.htg?.year||""} onChange={v=>sn("htg","year",v)} num/>
          <F label="Age" computed={s.htg?.year ? (new Date().getFullYear()-Number(s.htg.year))+" yrs" : "—"}/>
          <F label="Condition" value={s.htg?.condition||""} onChange={v=>sn("htg","condition",v)}/>
        </Gr></div>
        <div style={{marginTop:8}}><Gr>
          <F label="BTU Input" value={s.htg?.btuIn||""} onChange={v=>sn("htg","btuIn",v)} num/>
          <F label="BTU Output" value={s.htg?.btuOut||""} onChange={v=>sn("htg","btuOut",v)} num/>
          <F label="AFUE" computed={s.htg?.btuIn && s.htg?.btuOut ? (Number(s.htg.btuOut)/Number(s.htg.btuIn)*100).toFixed(1)+"%" : "—"} suffix="auto"/>
          <F label="Draft" value={s.htg?.draft||""} onChange={v=>sn("htg","draft",v)} num/>
        </Gr></div>
        <div style={{marginTop:6,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"0px 8px"}}>
          <CK checked={s.htg?.gasShutoff} onChange={v=>sn("htg","gasShutoff",v)} label="Gas Shut Off"/>
          <CK checked={s.htg?.asbestosPipes} onChange={v=>sn("htg","asbestosPipes",v)} label="Pipes Asbestos Wrapped"/>
          <CK checked={s.htg?.replaceRec} onChange={v=>sn("htg","replaceRec",v)} label="Replacement Recommended"/>
          {(()=>{
            const yr = Number(s.htg?.year||0);
            const age = yr ? new Date().getFullYear() - yr : 0;
            const autoOn = age > 3 && s.htg?.fuel==="Natural Gas" && !s.htg?.replaceRec;
            const val = s.htg?.cleanTuneOverride !== undefined ? s.htg.cleanTuneOverride : (autoOn || !!s.htg?.cleanTune);
            return <div style={{display:"flex",alignItems:"center",gap:4}}>
              <CK checked={val} onChange={v=>{sn("htg","cleanTune",v);sn("htg","cleanTuneOverride",v);}} label="Clean & Tune"/>
              {autoOn && s.htg?.cleanTuneOverride===undefined && <span style={{fontSize:8,color:"#818cf8"}}>auto</span>}
              {s.htg?.cleanTuneOverride!==undefined && autoOn && <span style={{fontSize:8,color:"#818cf8",cursor:"pointer",textDecoration:"underline"}} onClick={()=>{sn("htg","cleanTuneOverride",undefined);sn("htg","cleanTune",true);}}>↻ auto</span>}
            </div>;
          })()}
        </div>
        <textarea style={{...S.ta,marginTop:8}} value={s.htg?.notes||""} onChange={e=>sn("htg","notes",e.target.value)} rows={2} placeholder="Heating notes…"/>
        {(()=>{
          const recs = [];
          const afue = s.htg?.btuIn && s.htg?.btuOut ? Number(s.htg.btuOut)/Number(s.htg.btuIn)*100 : null;
          const fuel = s.htg?.fuel; const sys = s.htg?.system;
          if(fuel==="Electric") recs.push({t:"rec",m:"Electric resistance heat → eligible for heat pump replacement regardless of age/condition (ComEd)."});
          if(afue && afue < PROGRAM.furnaceMinAFUE && fuel==="Natural Gas") recs.push({t:"info",m:`AFUE ${afue.toFixed(1)}% — below ${PROGRAM.furnaceMinAFUE}% min for new furnace. Replacement only if failed/H&S risk and repair >$${PROGRAM.furnaceRepairCap}.`});
          if(afue && afue >= PROGRAM.furnaceMinAFUE) recs.push({t:"rec",m:`AFUE ${afue.toFixed(1)}% meets ≥${PROGRAM.furnaceMinAFUE}% program standard.`});
          if(sys==="Boiler" && afue && afue < PROGRAM.boilerMinAFUE) recs.push({t:"info",m:`Boiler AFUE ${afue.toFixed(1)}% — new boiler must be ≥${PROGRAM.boilerMinAFUE}%. Emergency replacement only.`});
          const furnAge = Number(s.htg?.year||0) ? new Date().getFullYear() - Number(s.htg.year) : 0;
          if(furnAge > 3 && fuel==="Natural Gas" && !s.htg?.replaceRec) recs.push({t:"rec",m:`Furnace is ${furnAge} yrs old (>3 yrs) → Clean & Tune auto-selected per program rules.`});
          if(s.htg?.cleanTune && fuel==="Natural Gas") recs.push({t:"info",m:`Furnace tune-up: must not have had tune-up within last 3 years.`});
          if(s.htg?.replaceRec && sys==="Boiler") recs.push({t:"rec",m:"System is Boiler → Boiler Replacement will be auto-selected in measures (not Furnace Replacement)."});
          if(s.htg?.replaceRec && sys!=="Boiler") recs.push({t:"rec",m:"System is Forced Air → Furnace Replacement will be auto-selected in measures. New furnace must be ≥95% AFUE."});
          if(sys==="Boiler" && p.measures.includes("Furnace Replacement")) recs.push({t:"flag",m:"⚠ Furnace Replacement is checked but system is Boiler — should be Boiler Replacement."});
          if(sys!=="Boiler" && sys && p.measures.includes("Boiler Replacement")) recs.push({t:"flag",m:"⚠ Boiler Replacement is checked but system is not a Boiler — should be Furnace Replacement."});
          return recs.map((r,i)=><Rec key={i} type={r.t}>{r.m}</Rec>);
        })()}
      </Sec>

      {/* ══ PAGE 2: COOLING SYSTEM ══ */}
      <Sec title="Cooling System Info">
        <Gr>
          <Sel label="Type" value={s.clg?.type||""} onChange={v=>sn("clg","type",v)} opts={["Central Air","Window Units","Mini Split","Heat Pump","None"]}/>
          <F label="Manufacturer" value={s.clg?.mfg||""} onChange={v=>sn("clg","mfg",v)}/>
          <F label="Install Year" value={s.clg?.year||""} onChange={v=>sn("clg","year",v)} num/>
          <F label="Age" computed={s.clg?.year ? (new Date().getFullYear()-Number(s.clg.year))+" yrs" : (s.clg?.age ? s.clg.age+" yrs" : "—")}/>
          <F label="SEER" value={s.clg?.seer||""} onChange={v=>sn("clg","seer",v)} num/>
          <F label="Condition" value={s.clg?.condition||""} onChange={v=>sn("clg","condition",v)}/>
          <Sel label="BTU Size" value={s.clg?.btu||""} onChange={v=>sn("clg","btu",v)} opts={["2 Ton (24k)","2.5 Ton (30k)","3 Ton (36k)","3.5 Ton (42k)"]}/>
        </Gr>
        <div style={{marginTop:6}}><CK checked={s.clg?.replaceRec} onChange={v=>sn("clg","replaceRec",v)} label="Replacement Recommended"/></div>
        {s.clg?.replaceRec && <div style={{marginTop:4}}><F label="Reason" value={s.clg?.replaceReason||""} onChange={v=>sn("clg","replaceReason",v)}/></div>}
      </Sec>

      {/* ══ PAGE 2: DOMESTIC HOT WATER ══ */}
      <Sec title="Domestic Hot Water Info">
        <Gr>
          <Sel label="Fuel" value={s.dhw?.fuel||""} onChange={v=>sn("dhw","fuel",v)} opts={["Natural Gas","Electric","Propane","Other"]}/>
          <Sel label="System Type" value={s.dhw?.system||""} onChange={v=>sn("dhw","system",v)} opts={["On Demand","Storage Tank","Indirect","Heat Pump","Other"]}/>
          <F label="Manufacturer" value={s.dhw?.mfg||""} onChange={v=>sn("dhw","mfg",v)}/>
          <F label="Install Year" value={s.dhw?.year||""} onChange={v=>sn("dhw","year",v)} num/>
          <F label="Age" computed={s.dhw?.year ? (new Date().getFullYear()-Number(s.dhw.year))+" yrs" : (s.dhw?.age ? s.dhw.age+" yrs" : "—")}/>
          <F label="Condition" value={s.dhw?.condition||""} onChange={v=>sn("dhw","condition",v)}/>
          <F label="Input BTU" value={s.dhw?.btuIn||""} onChange={v=>sn("dhw","btuIn",v)} num/>
          {(()=>{
            const key = `${s.dhw?.fuel||""}|${s.dhw?.system||""}`;
            const eff = PROGRAM.dhwEff[key];
            const btuIn = Number(s.dhw?.btuIn);
            const autoOut = eff && btuIn ? Math.round(btuIn * eff / 100) : null;
            return <>
              <F label="Output BTU" computed={autoOut ? autoOut.toLocaleString() : "—"} suffix={eff ? `${eff}% avg` : "select fuel+type"}/>
              <F label="Efficiency" computed={eff ? eff+"%" : "—"} suffix={eff ? `${s.dhw?.fuel} ${s.dhw?.system}` : "auto"}/>
            </>;
          })()}
        </Gr>
        {(()=>{
          const recs = [];
          const fuel = s.dhw?.fuel; const sys = s.dhw?.system;
          if(fuel==="Electric" && sys!=="Heat Pump") recs.push({t:"rec",m:"Electric resistance → eligible for Heat Pump WH replacement regardless of age/condition (ComEd). Must be Energy Star rated."});
          if(fuel==="Electric" && sys==="Heat Pump") recs.push({t:"info",m:"Heat Pump WH already installed — no replacement needed."});
          const key = `${fuel||""}|${sys||""}`;
          const eff = PROGRAM.dhwEff[key];
          if(fuel==="Natural Gas" && eff && eff/100 < PROGRAM.dhwMinEF) recs.push({t:"warn",m:`Avg efficiency ${eff}% (EF ~${(eff/100).toFixed(2)}) is below program minimum EF ≥0.67. If failed/H&S risk and repair >$650 → eligible for replacement.`});
          if(fuel==="Natural Gas" && eff && eff/100 >= PROGRAM.dhwMinEF) recs.push({t:"info",m:`Avg efficiency meets program minimum EF ≥0.67. Replacement only if failed/H&S and repair >$650.`});
          return recs.map((r,i)=><Rec key={i} type={r.t}>{r.m}</Rec>);
        })()}
        <div style={{marginTop:6,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"0px 8px"}}>
          <CK checked={s.dhw?.insulPipes} onChange={v=>sn("dhw","insulPipes",v)} label="Insulated Pipes"/>
          <CK checked={s.dhw?.flueRepair} onChange={v=>sn("dhw","flueRepair",v)} label="Flue Repair Needed"/>
          <CK checked={s.dhw?.replaceRec} onChange={v=>sn("dhw","replaceRec",v)} label="Replacement Recommended"/>
          <CK checked={s.dhw?.ductsSealed} onChange={v=>sn("dhw","ductsSealed",v)} label="Ducts Need Sealing"/>
        </div>
        {s.dhw?.replaceRec && <div style={{marginTop:6}}><F label="Reason" value={s.dhw?.replaceReason||""} onChange={v=>sn("dhw","replaceReason",v)}/></div>}
      </Sec>

      {/* ══ PAGE 3: INTERIOR INSPECTION ══ */}
      <Sec title="Interior Inspection">
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"0px 8px"}}>
          <CK checked={s.int?.mold} onChange={v=>sn("int","mold",v)} label="Mold"/>
          <CK checked={s.int?.moisture} onChange={v=>sn("int","moisture",v)} label="Moisture Problems"/>
          <CK checked={s.int?.knobTube} onChange={v=>sn("int","knobTube",v)} label="Live Knob & Tube"/>
          <CK checked={s.int?.electrical} onChange={v=>sn("int","electrical",v)} label="Electrical Issues"/>
          <CK checked={s.int?.brokenGlass} onChange={v=>sn("int","brokenGlass",v)} label="Broken Glass"/>
          <CK checked={s.int?.vermiculite} onChange={v=>sn("int","vermiculite",v)} label="Vermiculite/Asbestos"/>
          <CK checked={s.int?.waterLeaks} onChange={v=>sn("int","waterLeaks",v)} label="Water Leaks"/>
          <CK checked={s.int?.roofLeaks} onChange={v=>sn("int","roofLeaks",v)} label="Roof Leaks"/>
        </div>
        {(s.int?.waterLeaks || s.int?.roofLeaks) && <div style={{marginTop:6}}><Gr>
          {s.int?.waterLeaks && <F label="Water Leak Location" value={s.int?.waterLoc||""} onChange={v=>sn("int","waterLoc",v)}/>}
          {s.int?.roofLeaks && <F label="Roof Leak Location" value={s.int?.roofLoc||""} onChange={v=>sn("int","roofLoc",v)}/>}
        </Gr></div>}
        <div style={{marginTop:8}}><Gr>
          <Sel label="Ceiling Condition" value={s.int?.ceiling||""} onChange={v=>sn("int","ceiling",v)} opts={["Good","Poor"]}/>
          <Sel label="Wall Condition" value={s.int?.wall||""} onChange={v=>sn("int","wall",v)} opts={["Good","Poor"]}/>
        </Gr></div>
        <div style={{marginTop:6,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"0px 8px"}}>
          <CK checked={s.int?.droppedCeiling} onChange={v=>sn("int","droppedCeiling",v)} label="Dropped Ceiling"/>
          <CK checked={s.int?.drywallRepair} onChange={v=>sn("int","drywallRepair",v)} label="Drywall Repair"/>
          <CK checked={s.int?.recessedLight} onChange={v=>sn("int","recessedLight",v)} label="Recessed Lighting"/>
          <CK checked={s.int?.coDetector} onChange={v=>sn("int","coDetector",v)} label="CO Detector"/>
          <CK checked={s.int?.smokeDetector} onChange={v=>sn("int","smokeDetector",v)} label="Smoke Detector"/>
        </div>
        {s.int?.recessedLight && <div style={{marginTop:6}}><F label="Recessed Lighting Location" value={s.int?.recessedLoc||""} onChange={v=>sn("int","recessedLoc",v)}/></div>}
        {s.int?.knobTube && <Rec type="flag">LIVE KNOB & TUBE — insulation CANNOT proceed in affected areas until remediated by licensed electrician.</Rec>}
        {s.int?.vermiculite && <Rec type="flag">VERMICULITE/ASBESTOS — do NOT disturb. Abatement required before insulation. May use estimated blower door only.</Rec>}
        {s.int?.mold && <Rec type="flag">MOLD PRESENT — mold remediation must be completed before insulation work can begin.</Rec>}
        {s.htg?.asbestosPipes && <Rec type="flag">ASBESTOS-WRAPPED PIPES — do not disturb. Abatement may be required.</Rec>}
      </Sec>

      {/* ══ PAGE 3: DOOR TYPES / EXHAUST VENTING ══ */}
      <Sec title="Door Types / Exhaust Venting">
        <div style={{fontSize:11,fontWeight:600,color:"#818cf8",marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>Weather Strips / Door Sweeps</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"0px 8px"}}>
          {["Front","Back","Basement","Attic"].map(d=>(
            <CK key={d} checked={s.doors?.[d]} onChange={v=>sn("doors",d,v)} label={`${d} — Existing`}/>
          ))}
        </div>
        <div style={{maxWidth:200}}><F label="Total Strips/Sweeps Needed" value={s.totalSweeps||""} onChange={v=>ss("totalSweeps",v)}/></div>
        <div style={{marginTop:10,fontSize:11,fontWeight:600,color:"#818cf8",marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>Exhaust</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"0px 8px"}}>
          <CK checked={s.exh?.fanReplace} onChange={v=>sn("exh","fanReplace",v)} label="Exhaust Fan Replacement"/>
          <CK checked={s.exh?.bathFanLight} onChange={v=>sn("exh","bathFanLight",v)} label="Bath Fan w/ Light"/>
          <CK checked={s.exh?.ventKit} onChange={v=>sn("exh","ventKit",v)} label="Vent Kit Needed"/>
          <CK checked={s.exh?.termCap} onChange={v=>sn("exh","termCap",v)} label="Termination Cap Needed"/>
          <CK checked={s.exh?.dryerProper} onChange={v=>sn("exh","dryerProper",v)} label="Dryer Vented Properly"/>
          <CK checked={s.exh?.dryerRepair} onChange={v=>sn("exh","dryerRepair",v)} label="Dryer Vent Repair"/>
        </div>
        <div style={{marginTop:8}}><Gr>
          <F label="Blower Door In" value={s.exh?.bdIn||""} onChange={v=>sn("exh","bdIn",v)}/>
          <F label="Blower Door Out" value={s.exh?.bdOut||""} onChange={v=>sn("exh","bdOut",v)}/>
        </Gr></div>
        <div style={{marginTop:6}}><CK checked={s.exh?.noBD} onChange={v=>sn("exh","noBD",v)} label="No blower door — estimated (asbestos/vermiculite ONLY)"/></div>
        <textarea style={{...S.ta,marginTop:6}} value={s.exh?.notes||""} onChange={e=>sn("exh","notes",e.target.value)} rows={2} placeholder="Notes…"/>
      </Sec>

      {/* ══ PAGE 4: ATTIC ══ */}
      <Sec title="Attic">
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"0px 8px",marginBottom:8}}>
          <CK checked={s.attic?.finished} onChange={v=>sn("attic","finished",v)} label="Finished"/>
          <CK checked={s.attic?.unfinished} onChange={v=>sn("attic","unfinished",v)} label="Unfinished"/>
          <CK checked={s.attic?.flat} onChange={v=>sn("attic","flat",v)} label="Flat"/>
        </div>
        <Gr><F label="Sq Footage" value={s.attic?.sqft||""} onChange={v=>sn("attic","sqft",v)} num/><F label="Existing R-Value" value={s.attic?.preR||""} onChange={v=>sn("attic","preR",v)} num/><F label="R-Value to Add" value={s.attic?.addR||""} onChange={v=>sn("attic","addR",v)} num/><F label="Total R" computed={s.attic?.preR||s.attic?.addR ? "R-"+(Number(s.attic?.preR||0)+Number(s.attic?.addR||0)) : "—"} suffix="auto"/></Gr>
        <div style={{marginTop:8}}><Gr>
          <F label="Recessed Lighting Qty" value={s.attic?.recessQty||""} onChange={v=>sn("attic","recessQty",v)}/>
          <F label="Storage Created" value={s.attic?.storage||""} onChange={v=>sn("attic","storage",v)} num/>
        </Gr></div>
        <div style={{marginTop:6,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"0px 8px"}}>
          <CK checked={s.attic?.ductwork} onChange={v=>sn("attic","ductwork",v)} label="Ductwork Present"/>
          <CK checked={s.attic?.floorBoards} onChange={v=>sn("attic","floorBoards",v)} label="Floor Boards"/>
          <CK checked={s.attic?.moldPresent} onChange={v=>sn("attic","moldPresent",v)} label="Mold Present"/>
          <CK checked={s.attic?.vermPresent} onChange={v=>sn("attic","vermPresent",v)} label="Vermiculite Present"/>
          <CK checked={s.attic?.knobTube} onChange={v=>sn("attic","knobTube",v)} label="Knob & Tube"/>
        </div>
        {s.attic?.ductwork && <Gr><Sel label="Duct Condition" value={s.attic?.condition||""} onChange={v=>sn("attic","condition",v)} opts={["Good","Poor"]}/><F label="Duct LnFt to Air Seal" value={s.attic?.lnftAirSeal||""} onChange={v=>sn("attic","lnftAirSeal",v)} num/></Gr>}
        <div style={{marginTop:6}}><Gr>
          <F label="Existing Ventilation" value={s.attic?.existVent||""} onChange={v=>sn("attic","existVent",v)}/>
          <F label="Needed Ventilation" value={s.attic?.needVent||""} onChange={v=>sn("attic","needVent",v)}/>
          <F label="Access Location" value={s.attic?.accessLoc||""} onChange={v=>sn("attic","accessLoc",v)}/>
        </Gr></div>
        <textarea style={{...S.ta,marginTop:6}} value={s.attic?.notes||""} onChange={e=>sn("attic","notes",e.target.value)} rows={2} placeholder="Attic notes…"/>
        <InsulRec section="attic" preR={s.attic?.preR} addR={s.attic?.addR}/>
        {s.attic?.ceilingCond==="Poor" && <Rec type="warn">Poor ceiling condition — consider fiberglass instead of cellulose (cellulose weighs ~2x fiberglass for same R-value).</Rec>}
        {s.attic?.floorBoards && <Rec type="info">Floor boards present — dense pack at 3.5 lbs/ft³ unless homeowner agrees to remove flooring and blow to R-49.</Rec>}
        {s.attic?.knobTube && <Rec type="flag">KNOB & TUBE in attic — insulation CANNOT proceed until remediated by licensed electrician.</Rec>}
        {s.attic?.vermPresent && <Rec type="flag">VERMICULITE in attic — do NOT disturb. Abatement required before insulation.</Rec>}
        {s.attic?.moldPresent && <Rec type="flag">MOLD in attic — remediation required before insulation work.</Rec>}
      </Sec>

      {/* ══ PAGE 4: COLLAR BEAM ══ */}
      <Sec title="Collar Beam">
        <Gr><F label="Sq Footage" value={s.collar?.sqft||""} onChange={v=>sn("collar","sqft",v)} num/><F label="Pre-Existing R" value={s.collar?.preR||""} onChange={v=>sn("collar","preR",v)} num/><F label="R-Value to Add" value={s.collar?.addR||""} onChange={v=>sn("collar","addR",v)} num/><F label="Total R" computed={s.collar?.preR||s.collar?.addR ? "R-"+(Number(s.collar?.preR||0)+Number(s.collar?.addR||0)) : "—"} suffix="auto"/></Gr>
        <div style={{marginTop:6,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"0px 8px"}}>
          <CK checked={s.collar?.accessible} onChange={v=>sn("collar","accessible",v)} label="Accessible"/>
          <CK checked={s.collar?.cutIn} onChange={v=>sn("collar","cutIn",v)} label="Cut In Needed"/>
          <CK checked={s.collar?.ductwork} onChange={v=>sn("collar","ductwork",v)} label="Ductwork"/>
        </div>
        {s.collar?.ductwork && <div style={{marginTop:6}}><Gr><Sel label="Condition" value={s.collar?.condition||""} onChange={v=>sn("collar","condition",v)} opts={["Good","Poor"]}/><F label="Ln Ft Air Seal" value={s.collar?.lnftAirSeal||""} onChange={v=>sn("collar","lnftAirSeal",v)} num/></Gr></div>}
        <InsulRec section="collar" preR={s.collar?.preR} addR={s.collar?.addR}/>
      </Sec>

      {/* ══ PAGE 4: OUTER CEILING JOISTS ══ */}
      <Sec title="Outer Ceiling Joists">
        <Gr><F label="Sq Ft" value={s.outerCeiling?.sqft||""} onChange={v=>sn("outerCeiling","sqft",v)} num/><F label="Pre-Existing R" value={s.outerCeiling?.preR||""} onChange={v=>sn("outerCeiling","preR",v)} num/><F label="R to Add" value={s.outerCeiling?.addR||""} onChange={v=>sn("outerCeiling","addR",v)} num/><F label="Total R" computed={s.outerCeiling?.preR||s.outerCeiling?.addR ? "R-"+(Number(s.outerCeiling?.preR||0)+Number(s.outerCeiling?.addR||0)) : "—"} suffix="auto"/></Gr>
        <div style={{marginTop:6,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"0px 8px"}}>
          <CK checked={s.outerCeiling?.accessible} onChange={v=>sn("outerCeiling","accessible",v)} label="Accessible"/>
          <CK checked={s.outerCeiling?.cutIn} onChange={v=>sn("outerCeiling","cutIn",v)} label="Cut In"/>
          <CK checked={s.outerCeiling?.floorBoards} onChange={v=>sn("outerCeiling","floorBoards",v)} label="Floor Boards"/>
          <CK checked={s.outerCeiling?.ductwork} onChange={v=>sn("outerCeiling","ductwork",v)} label="Ductwork"/>
        </div>
        {s.outerCeiling?.ductwork && <div style={{marginTop:6}}><Gr><Sel label="Condition" value={s.outerCeiling?.condition||""} onChange={v=>sn("outerCeiling","condition",v)} opts={["Good","Poor"]}/><F label="Ln Ft Air Seal" value={s.outerCeiling?.lnftAirSeal||""} onChange={v=>sn("outerCeiling","lnftAirSeal",v)} num/></Gr></div>}
        <InsulRec section="outerCeiling" preR={s.outerCeiling?.preR} addR={s.outerCeiling?.addR}/>
      </Sec>

      <Sec title="Knee Walls">
        <Gr><F label="Sq Ft" value={s.kneeWall?.sqft||""} onChange={v=>sn("kneeWall","sqft",v)} num/><F label="Pre-Existing R" value={s.kneeWall?.preR||""} onChange={v=>sn("kneeWall","preR",v)} num/><F label="R to Add" value={s.kneeWall?.addR||""} onChange={v=>sn("kneeWall","addR",v)} num/><F label="Total R" computed={s.kneeWall?.preR||s.kneeWall?.addR ? "R-"+(Number(s.kneeWall?.preR||0)+Number(s.kneeWall?.addR||0)) : "—"} suffix="auto"/></Gr>
        <div style={{marginTop:6,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"0px 8px"}}>
          <CK checked={s.kneeWall?.densePack} onChange={v=>sn("kneeWall","densePack",v)} label="Dense Pack"/>
          <CK checked={s.kneeWall?.rigidFoam} onChange={v=>sn("kneeWall","rigidFoam",v)} label="Rigid Foam Board"/>
          <CK checked={s.kneeWall?.tyvek} onChange={v=>sn("kneeWall","tyvek",v)} label="Tyvek Needed"/>
          <CK checked={s.kneeWall?.fgBatts} onChange={v=>sn("kneeWall","fgBatts",v)} label="Fiberglass Batts"/>
        </div>
        <div style={{marginTop:6}}><Sel label="Wall Type" value={s.kneeWall?.wallType||""} onChange={v=>sn("kneeWall","wallType",v)} opts={["Drywall","Plaster"]}/></div>
        {s.kneeWall?.tyvek && <div style={{marginTop:6}}><F label="Tyvek Sq Ft" value={s.kneeWall?.tyvekSqft||""} onChange={v=>sn("kneeWall","tyvekSqft",v)} num/></div>}
        <InsulRec section="kneeWall" preR={s.kneeWall?.preR} addR={s.kneeWall?.addR}/>
        {s.kneeWall?.preR && Number(s.kneeWall?.preR)===0 && <Rec type="info">Knee wall cavity must have no existing thermal resistance to qualify. Insulate to R-11 or greater (R-13+5 or R-20 preferred).</Rec>}
      </Sec>

      <Sec title="Exterior Walls — 1st Floor">
        <Gr><F label="Sq Ft" value={s.extWall1?.sqft||""} onChange={v=>sn("extWall1","sqft",v)} num/><F label="Pre-Existing R" value={s.extWall1?.preR||""} onChange={v=>sn("extWall1","preR",v)} num/><F label="R to Add" value={s.extWall1?.addR||""} onChange={v=>sn("extWall1","addR",v)} num/><F label="Win/Door SqFt" computed={s.extWall1?.sqft ? Math.round(Number(s.extWall1.sqft)*0.16) : "—"}/><F label="Total R" computed={s.extWall1?.preR||s.extWall1?.addR ? "R-"+(Number(s.extWall1?.preR||0)+Number(s.extWall1?.addR||0)) : "—"} suffix="auto"/></Gr>
        <div style={{marginTop:6,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"0px 8px"}}>
          <CK checked={s.extWall1?.densePack} onChange={v=>sn("extWall1","densePack",v)} label="Dense Pack"/>
          <CK checked={s.extWall1?.phenolic} onChange={v=>sn("extWall1","phenolic",v)} label="Phenolic Foam"/>
        </div>
        <div style={{marginTop:6}}><Gr>
          <Sel label="Cladding" value={s.extWall1?.cladding||""} onChange={v=>sn("extWall1","cladding",v)} opts={["Vinyl","Masonry","Other"]}/>
          <Sel label="Insulate From" value={s.extWall1?.insulFrom||""} onChange={v=>sn("extWall1","insulFrom",v)} opts={["Interior","Exterior"]}/>
          <Sel label="Wall Type" value={s.extWall1?.wallType||""} onChange={v=>sn("extWall1","wallType",v)} opts={["Drywall","Plaster"]}/>
          <F label="Drilled Hole Location" value={s.extWall1?.drillLoc||""} onChange={v=>sn("extWall1","drillLoc",v)}/>
          {s.extWall1?.cladding==="Other"&&<F label="Other Cladding" value={s.extWall1?.otherClad||""} onChange={v=>sn("extWall1","otherClad",v)}/>}
        </Gr></div>
        <div style={{marginTop:4}}><CK checked={s.extWall1?.ownerPrep} onChange={v=>sn("extWall1","ownerPrep",v)} label="Informed owner about prep"/></div>
        <InsulRec section="extWall1" preR={s.extWall1?.preR} addR={s.extWall1?.addR}/>
        {s.extWall1?.preR && Number(s.extWall1.preR) > 0 && <Rec type="info">Walls may only be insulated if no existing insulation or existing is in poor condition.</Rec>}
      </Sec>

      <Sec title="Exterior Walls — 2nd Floor">
        <Gr><F label="Sq Ft" value={s.extWall2?.sqft||""} onChange={v=>sn("extWall2","sqft",v)} num/><F label="Pre-Existing R" value={s.extWall2?.preR||""} onChange={v=>sn("extWall2","preR",v)} num/><F label="R to Add" value={s.extWall2?.addR||""} onChange={v=>sn("extWall2","addR",v)} num/><F label="Win/Door SqFt" computed={s.extWall2?.sqft ? Math.round(Number(s.extWall2.sqft)*0.14) : "—"}/><F label="Total R" computed={s.extWall2?.preR||s.extWall2?.addR ? "R-"+(Number(s.extWall2?.preR||0)+Number(s.extWall2?.addR||0)) : "—"} suffix="auto"/></Gr>
        <div style={{marginTop:6,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"0px 8px"}}>
          <CK checked={s.extWall2?.densePack} onChange={v=>sn("extWall2","densePack",v)} label="Dense Pack"/>
          <CK checked={s.extWall2?.phenolic} onChange={v=>sn("extWall2","phenolic",v)} label="Phenolic Foam"/>
        </div>
        <div style={{marginTop:6}}><Gr>
          <Sel label="Cladding" value={s.extWall2?.cladding||""} onChange={v=>sn("extWall2","cladding",v)} opts={["Vinyl","Masonry","Other"]}/>
          <Sel label="Insulate From" value={s.extWall2?.insulFrom||""} onChange={v=>sn("extWall2","insulFrom",v)} opts={["Interior","Exterior"]}/>
          <Sel label="Wall Type" value={s.extWall2?.wallType||""} onChange={v=>sn("extWall2","wallType",v)} opts={["Drywall","Plaster"]}/>
          <F label="Drilled Hole Location" value={s.extWall2?.drillLoc||""} onChange={v=>sn("extWall2","drillLoc",v)}/>
          {s.extWall2?.cladding==="Other"&&<F label="Other Cladding" value={s.extWall2?.otherClad||""} onChange={v=>sn("extWall2","otherClad",v)}/>}
        </Gr></div>
        <div style={{marginTop:4}}><CK checked={s.extWall2?.ownerPrep} onChange={v=>sn("extWall2","ownerPrep",v)} label="Informed owner about prep"/></div>
        <InsulRec section="extWall2" preR={s.extWall2?.preR} addR={s.extWall2?.addR}/>
      </Sec>

      <Sec title="Foundation / Crawl">
        <div style={{marginBottom:8}}><Sel label="Type" value={s.fnd?.type||""} onChange={v=>sn("fnd","type",v)} opts={["No Basement/Slab","Finished","Unfinished","w/ Framing"]}/></div>
        <Gr><F label="Above Grade SqFt" value={s.fnd?.aboveSqft||""} onChange={v=>sn("fnd","aboveSqft",v)} num/><F label="Below Grade SqFt" value={s.fnd?.belowSqft||""} onChange={v=>sn("fnd","belowSqft",v)} num/><F label="Pre-Existing R" value={s.fnd?.preR||""} onChange={v=>sn("fnd","preR",v)} num/></Gr>
        <div style={{marginTop:8}}><Sel label="Insulation Type" value={s.fnd?.insulType||""} onChange={v=>sn("fnd","insulType",v)} opts={["Fiberglass","Rigid Foam Board","None"]}/></div>
        <div style={{marginTop:8,fontSize:11,fontWeight:600,color:"#818cf8",textTransform:"uppercase",letterSpacing:".05em"}}>Band Joists</div>
        <div style={{marginTop:4}}><CK checked={s.fnd?.bandAccess} onChange={v=>sn("fnd","bandAccess",v)} label="Access to Band Joists"/></div>
        {s.fnd?.bandAccess && <div style={{marginTop:4}}><Gr><F label="Linear Ft" value={s.fnd?.bandLnft||""} onChange={v=>sn("fnd","bandLnft",v)}/><F label="Pre-Existing R" value={s.fnd?.bandR||""} onChange={v=>sn("fnd","bandR",v)}/><Sel label="Insulation" value={s.fnd?.bandInsul||""} onChange={v=>sn("fnd","bandInsul",v)} opts={["Fiberglass","Rigid Foam Board","None"]}/></Gr></div>}

        <div style={{marginTop:10,fontSize:11,fontWeight:600,color:"#818cf8",textTransform:"uppercase",letterSpacing:".05em"}}>Crawlspace</div>
        <div style={{marginTop:4,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"0px 8px"}}>
          <CK checked={s.fnd?.vented} onChange={v=>sn("fnd","vented",v)} label="Vented"/>
          <CK checked={s.fnd?.vaporBarrier} onChange={v=>sn("fnd","vaporBarrier",v)} label="Vapor Barrier Needed"/>
          <CK checked={s.fnd?.waterIssues} onChange={v=>sn("fnd","waterIssues",v)} label="Water Issues"/>
          <CK checked={s.fnd?.crawlDuct} onChange={v=>sn("fnd","crawlDuct",v)} label="Ductwork"/>
        </div>
        <div style={{marginTop:6}}><Gr>
          <Sel label="Crawl Floor" value={s.fnd?.crawlFloor||""} onChange={v=>sn("fnd","crawlFloor",v)} opts={["Concrete","Dirt/Gravel"]}/>
          {s.fnd?.vented && <F label="# of Vents" value={s.fnd?.ventCount||""} onChange={v=>sn("fnd","ventCount",v)}/>}
          {s.fnd?.vaporBarrier && <F label="Barrier SqFt" value={s.fnd?.barrierSqft||""} onChange={v=>sn("fnd","barrierSqft",v)}/>}
          {s.fnd?.crawlDuct && <Sel label="Duct Condition" value={s.fnd?.ductCond||""} onChange={v=>sn("fnd","ductCond",v)} opts={["Good","Poor"]}/>}
        </Gr></div>
        <div style={{marginTop:6}}><Gr>
          <F label="Crawl Above Grade SqFt" value={s.fnd?.crawlAbove||""} onChange={v=>sn("fnd","crawlAbove",v)}/>
          <F label="Crawl Below Grade SqFt" value={s.fnd?.crawlBelow||""} onChange={v=>sn("fnd","crawlBelow",v)}/>
          <F label="Crawl Pre-Existing R" value={s.fnd?.crawlR||""} onChange={v=>sn("fnd","crawlR",v)}/>
        </Gr></div>
        <div style={{marginTop:6}}><CK checked={s.fnd?.crawlBandAccess} onChange={v=>sn("fnd","crawlBandAccess",v)} label="Crawl Band Joist Access"/></div>
        {s.fnd?.crawlBandAccess && <div style={{marginTop:4}}><Gr>
          <F label="Crawl Band LnFt" value={s.fnd?.crawlBandLnft||""} onChange={v=>sn("fnd","crawlBandLnft",v)}/>
          <F label="Crawl Band R" value={s.fnd?.crawlBandR||""} onChange={v=>sn("fnd","crawlBandR",v)}/>
          <Sel label="Crawl Band Insulation" value={s.fnd?.crawlBandInsul||""} onChange={v=>sn("fnd","crawlBandInsul",v)} opts={["Fiberglass","Rigid Foam Board","None"]}/>
        </Gr></div>}
        <div style={{marginTop:6}}><CK checked={s.fnd?.crawlWallsObstructed} onChange={v=>sn("fnd","crawlWallsObstructed",v)} label="Crawl walls insulated or obstructed already"/></div>
        <InsulRec section="fnd" preR={s.fnd?.preR} addR={null}/>
        {s.fnd?.preR && Number(s.fnd.preR) === 0 && <Rec type="rec">No existing basement wall insulation → eligible. Bring to min R-10/13. Rigid foam board or batt insulation.</Rec>}
        {s.fnd?.preR && Number(s.fnd.preR) >= 10 && <Rec type="info">Existing R-{s.fnd.preR} — basement wall insulation not needed.</Rec>}
        {s.fnd?.bandAccess && Number(s.fnd?.bandR||0) === 0 && <Rec type="rec">Rim joist has no insulation → insulate to min R-10. Batt insulation NOT allowed for rim joist.</Rec>}
        {s.fnd?.vaporBarrier && s.fnd?.crawlFloor==="Dirt/Gravel" && <Rec type="rec">Dirt/gravel crawl floor — vapor barrier (min 6 mil) required before wall insulation.</Rec>}
        {s.fnd?.crawlR !== undefined && Number(s.fnd?.crawlR||0) === 0 && <Rec type="rec">Crawlspace walls → insulate to R-15/19 with rigid foam board or 2-part spray foam. No fibrous insulation on crawl walls.</Rec>}
        {s.fnd?.waterIssues && <Rec type="flag">Water issues present — must be resolved before insulation work can proceed.</Rec>}
      </Sec>

      <Sec title="Diagnostics">
        <Gr><F label="Pre CFM50" value={p.preCFM50} onChange={v=>u({preCFM50:v})} num/><F label="Ext Temp" value={s.extTemp||""} onChange={v=>ss("extTemp",v)} num/><Sel label="BD Location" value={p.bdLoc} onChange={v=>u({bdLoc:v})} opts={["Front","Side","Back"]}/></Gr>
        {(()=>{
          const cfm = Number(p.preCFM50); const sqft = Number(p.sqft);
          const recs = [];
          if(cfm && sqft) {
            const pct = cfm / sqft;
            if(pct >= PROGRAM.airSealMinCFM50pct) recs.push({t:"rec",m:`CFM50 ${cfm} is ≥110% of ${sqft} sqft (${(pct*100).toFixed(0)}%). Air sealing eligible.`});
            else recs.push({t:"warn",m:`CFM50 ${cfm} is ${(pct*100).toFixed(0)}% of sqft — below 110% threshold. Air sealing may not be eligible.`});
            const target25 = Math.round(cfm * 0.75);
            recs.push({t:"info",m:`25% reduction goal: post-CFM50 target ≤${target25}. Need to reduce by ≥${cfm - target25} CFM50.`});
          }
          return recs.map((r,i)=><Rec key={i} type={r.t}>{r.m}</Rec>);
        })()}
        <textarea style={{...S.ta,marginTop:6}} value={s.diagNotes||""} onChange={e=>ss("diagNotes",e.target.value)} rows={2} placeholder="Diagnostics notes…"/>
      </Sec>

      <Sec title="ASHRAE 62.2-2016 Ventilation">
        {(() => {
          const a = p.audit || {};
          const baseSqft = Number(p.sqft) || 0;
          const finBasement = s.fnd?.type === "Finished" ? (Number(s.fnd?.aboveSqft)||0) + (Number(s.fnd?.belowSqft)||0) : 0;
          const Afl = baseSqft + finBasement;
          const Nbr = Number(s.bedrooms) || 0;
          const Q50 = Number(p.preCFM50) || 0;
          const st = Number(p.stories) || 1;
          const H = st >= 2 ? 16 : st >= 1.5 ? 14 : 8;
          const Hr = 8.202;
          const wsf = 0.56;

          // Fan flows from assessment, overridable
          // Raw values to check presence (blank = no fan = no requirement)
          const kRaw = s.ashrae?.kitchenCFM ?? a.kitchenFan ?? "";
          const b1Raw = s.ashrae?.bath1CFM ?? a.bathFan1 ?? "";
          const b2Raw = s.ashrae?.bath2CFM ?? a.bathFan2 ?? "";
          const b3Raw = s.ashrae?.bath3CFM ?? a.bathFan3 ?? "";
          const kPresent = String(kRaw).trim() !== "";
          const b1Present = String(b1Raw).trim() !== "";
          const b2Present = String(b2Raw).trim() !== "";
          const b3Present = String(b3Raw).trim() !== "";
          const kCFM = Number(kRaw) || 0;
          const b1 = Number(b1Raw) || 0;
          const b2 = Number(b2Raw) || 0;
          const b3 = Number(b3Raw) || 0;
          const kWin = s.ashrae?.kWin || false;
          const b1Win = s.ashrae?.b1Win || false;
          const b2Win = s.ashrae?.b2Win || false;
          const b3Win = s.ashrae?.b3Win || false;

          /* ══ ASHRAE 62.2-2016 CALCULATIONS ══
             Section 4.1.1 — Total Required Ventilation Rate
             Qtot = 0.03 × Afl + 7.5 × (Nbr + 1)
             (Nbr = number of bedrooms, Nocc = Nbr + 1)
             
             Infiltration Credit
             Qinf = 0.052 × Q50 × wsf × (H / 8.2)^0.4
             
             Local Ventilation — Alternative Compliance:
             Intermittent exhaust rates: Kitchen 100 CFM, Bath 50 CFM
             Deficit = max(0, required - measured). Window = 20 CFM credit.
             Blank = no fan = no requirement.
             Alternative compliance supplement = totalDeficit × 0.25
             (converts intermittent deficit to continuous equivalent)
             
             Qfan = Qtot + supplement - Qinf
          */

          // Infiltration credit
          const Qinf_eff = Q50 > 0 ? 0.052 * Q50 * wsf * Math.pow(H / 8.2, 0.4) : 0;

          // Qtot (Eq 4.1a)
          const Qtot = (Afl > 0) ? 0.03 * Afl + 7.5 * (Nbr + 1) : 0;

          // Local ventilation deficits — Alternative Compliance
          // Intermittent rates: Kitchen 100 CFM, Bath 50 CFM
          // Window = 20 CFM credit. Blank = no fan = no requirement.
          const kReq = kPresent ? 100 : 0;
          const b1Req = b1Present ? 50 : 0;
          const b2Req = b2Present ? 50 : 0;
          const b3Req = b3Present ? 50 : 0;
          const kDef = !kPresent ? 0 : Math.max(0, kReq - (kWin ? 20 : kCFM));
          const b1Def = !b1Present ? 0 : Math.max(0, b1Req - (b1Win ? 20 : b1));
          const b2Def = !b2Present ? 0 : Math.max(0, b2Req - (b2Win ? 20 : b2));
          const b3Def = !b3Present ? 0 : Math.max(0, b3Req - (b3Win ? 20 : b3));
          const totalDef = kDef + b1Def + b2Def + b3Def;

          // Alternative compliance supplement (intermittent → continuous: ×0.25)
          const supplement = totalDef * 0.25;

          // Infiltration credit — existing: FULL credit
          const Qinf_credit = Qinf_eff;

          // Required mechanical ventilation rate
          const Qfan = Qtot + supplement - Qinf_credit;

          // Fan setting selector (continuous run: 50 / 80 / 110 CFM)
          const FAN_SETTINGS = [50, 80, 110];
          const recFan = FAN_SETTINGS.find(f => f >= Qfan) || FAN_SETTINGS[FAN_SETTINGS.length - 1];

          const R = v => Math.round(v * 100) / 100;
          const Ri = v => Math.round(v);

          // Styles
          const hdr = {fontSize:13,fontWeight:700,color:"#818cf8",margin:"14px 0 6px",borderBottom:"1px solid rgba(99,102,241,.25)",paddingBottom:4};
          const row = {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",fontSize:12,borderBottom:"1px solid rgba(255,255,255,.04)"};
          const lbl = {color:"#94a3b8",flex:1};
          const val = {fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:"#e2e8f0",textAlign:"right"};
          const eq = {fontSize:10,color:"#475569",padding:"1px 0 5px 12px",fontFamily:"'JetBrains Mono',monospace",borderLeft:"2px solid rgba(99,102,241,.15)"};
          const autoBox = {background:"rgba(99,102,241,.06)",borderRadius:6,padding:"6px 10px",fontFamily:"'JetBrains Mono',monospace",fontWeight:600,fontSize:13,color:"#e2e8f0",textAlign:"center"};
          const autoSub = {fontSize:9,color:"#64748b",textAlign:"center",marginTop:2};
          const resultBox = {background:"rgba(168,85,247,.08)",border:"2px solid rgba(168,85,247,.3)",borderRadius:8,padding:12,marginTop:8};
          const solverBox = (c) => ({background:`rgba(${c},.04)`,border:`1px solid rgba(${c},.2)`,borderRadius:8,padding:10,marginTop:10});

          return (
            <div>
              {/* ══ CONFIGURATION ══ */}
              <div style={hdr}>Configuration</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 16px",fontSize:12}}>
                <div style={row}><span style={lbl}>Construction</span><span style={val}>Existing</span></div>
                <div style={row}><span style={lbl}>Dwelling unit</span><span style={val}>Detached</span></div>
                <div style={row}><span style={lbl}>Infiltration credit</span><span style={val}>Yes</span></div>
                <div style={row}><span style={lbl}>Alt. compliance</span><span style={val}>Yes</span></div>
                <div style={row}><span style={lbl}>Weather station</span><span style={val}>Chicago Midway AP</span></div>
                <div style={row}><span style={lbl}>wsf [1/hr]</span><span style={{...val,color:"#818cf8"}}>{wsf}</span></div>
              </div>

              {/* ══ BUILDING INPUTS ══ */}
              <div style={hdr}>Building Inputs</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
                <div><div style={{fontSize:10,color:"#94a3b8",marginBottom:3}}>Floor area [ft²]</div><div style={autoBox}>{Afl||"—"}</div><div style={autoSub}>{finBasement > 0 ? `${baseSqft} + ${finBasement} fin. bsmt` : "← Sq Footage"}</div></div>
                <div><div style={{fontSize:10,color:"#94a3b8",marginBottom:3}}>Nbr (bedrooms)</div><div style={autoBox}>{Nbr}</div><div style={autoSub}>Occupants = Nbr + 1 = {Nbr + 1}</div></div>
                <div><div style={{fontSize:10,color:"#94a3b8",marginBottom:3}}>Height [ft]</div><div style={autoBox}>{H}</div><div style={autoSub}>{st>=2?"2-story":"1"+(st>=1.5?".5":"")+"-story"}</div></div>
                <div><div style={{fontSize:10,color:"#94a3b8",marginBottom:3}}>Q50 [CFM]</div><div style={autoBox}>{Q50||"—"}</div><div style={autoSub}>← Diagnostics</div></div>
              </div>

              {/* ══ LOCAL VENTILATION ══ */}
              <div style={hdr}>Local Ventilation — Alternative Compliance</div>
              <div style={{fontSize:9,color:"#64748b",marginBottom:2}}>Blank = no fan = no requirement. Openable window = 20 CFM credit. Kitchen: 100 CFM · Bath: 50 CFM (intermittent rates)</div>
              <div style={{fontSize:9,color:"#f59e0b",marginBottom:6}}>⚠ If a fan is present but not operational or CFM is unknown, enter 0.</div>
              <div style={{display:"grid",gridTemplateColumns:"80px 1fr 60px 50px 55px",gap:"2px 6px",fontSize:11,alignItems:"center"}}>
                <span style={{fontWeight:600,color:"#64748b"}}></span>
                <span style={{fontWeight:600,color:"#64748b",textAlign:"center"}}>Fan Flow [CFM]</span>
                <span style={{fontWeight:600,color:"#64748b",textAlign:"center",fontSize:9}}>Window</span>
                <span style={{fontWeight:600,color:"#64748b",textAlign:"center"}}>Req'd</span>
                <span style={{fontWeight:600,color:"#64748b",textAlign:"center"}}>Deficit</span>
              </div>
              {[
                {n:"Kitchen",v:kCFM,k:"kitchenCFM",ak:"kitchenFan",w:kWin,wk:"kWin",r:kReq,d:kDef,present:kPresent},
                {n:"Bath #1",v:b1,k:"bath1CFM",ak:"bathFan1",w:b1Win,wk:"b1Win",r:b1Req,d:b1Def,present:b1Present},
                {n:"Bath #2",v:b2,k:"bath2CFM",ak:"bathFan2",w:b2Win,wk:"b2Win",r:b2Req,d:b2Def,present:b2Present},
                {n:"Bath #3",v:b3,k:"bath3CFM",ak:"bathFan3",w:b3Win,wk:"b3Win",r:b3Req,d:b3Def,present:b3Present},
              ].map(f=>(
                <div key={f.n} style={{display:"grid",gridTemplateColumns:"80px 1fr 60px 50px 55px",gap:"2px 6px",alignItems:"center",marginBottom:2}}>
                  <span style={{fontSize:12,color:"#cbd5e1"}}>{f.n}</span>
                  <input style={{...S.inp,textAlign:"center",fontSize:12}} value={s.ashrae?.[f.k]??a[f.ak]??""} onChange={e=>sn("ashrae",f.k,e.target.value)} placeholder="blank = none"/>
                  <div style={{textAlign:"center"}}><input type="checkbox" checked={f.w} onChange={e=>sn("ashrae",f.wk,e.target.checked)} style={{accentColor:"#818cf8"}}/></div>
                  <div style={{textAlign:"center",fontSize:11,color:f.present?"#64748b":"#475569"}}>{f.present?f.r:"—"}</div>
                  <div style={{textAlign:"center",fontSize:13,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:!f.present?"#475569":f.d>0?"#f59e0b":"#22c55e"}}>{f.present?f.d:"—"}</div>
                </div>
              ))}
              <div style={{display:"grid",gridTemplateColumns:"80px 1fr 60px 50px 55px",gap:"2px 6px",borderTop:"1px solid rgba(255,255,255,.1)",paddingTop:4,marginTop:4}}>
                <span style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>Total</span>
                <span></span><span></span><span></span>
                <div style={{textAlign:"center",fontSize:14,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:totalDef>0?"#f59e0b":"#22c55e"}}>{Ri(totalDef)}</div>
              </div>

              {/* ══ RESULTS ══ */}
              <div style={resultBox}>
                <div style={{fontSize:13,fontWeight:700,color:"#a855f7",marginBottom:10}}>Dwelling-Unit Ventilation Results</div>

                <div style={row}><span style={lbl}>Infiltration credit, Qinf [CFM]</span><span style={val}>{R(Qinf_eff)}</span></div>
                <div style={eq}>= 0.052 × Q50 × wsf × (H / 8.2)^0.4<br/>= 0.052 × {Q50} × {wsf} × ({H} / 8.2)^0.4</div>

                <div style={row}><span style={lbl}>Total required ventilation rate, Qtot [CFM]</span><span style={val}>{R(Qtot)}</span></div>
                <div style={eq}>= 0.03 × Afl + 7.5 × (Nbr + 1)<br/>= 0.03 × {Afl} + 7.5 × ({Nbr} + 1)<br/>= {R(0.03*Afl)} + {R(7.5*(Nbr+1))}</div>

                <div style={row}><span style={lbl}>Total local ventilation deficit [CFM]</span><span style={val}>{Ri(totalDef)}</span></div>
                <div style={eq}>= Σ max(0, req − measured) per fan<br/>Kitchen {kReq} − {kCFM} = {kDef} · Bath1 {b1Req} − {b1} = {b1Def} · Bath2 {b2Req} − {b2} = {b2Def} · Bath3 {b3Req} − {b3} = {b3Def}</div>

                <div style={row}><span style={lbl}>Alternative compliance supplement [CFM]</span><span style={val}>{R(supplement)}</span></div>
                <div style={eq}>= totalDeficit × 0.25 (intermittent → continuous)<br/>= {Ri(totalDef)} × 0.25</div>

                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0 4px",borderTop:"2px solid rgba(168,85,247,.4)",marginTop:8}}>
                  <span style={{fontWeight:700,color:"#e2e8f0",fontSize:13}}>Required mech. ventilation, Qfan [CFM]</span>
                  <span style={{fontWeight:800,color:"#a855f7",fontSize:18,fontFamily:"'JetBrains Mono',monospace"}}>{R(Qfan)}</span>
                </div>
                <div style={eq}>= Qtot + supplement − Qinf<br/>= {R(Qtot)} + {R(supplement)} − {R(Qinf_credit)}</div>
              </div>

              {/* ══ DWELLING-UNIT VENTILATION RUN-TIME SOLVER ══ */}
              <div style={solverBox("99,102,241")}>
                <div style={{fontSize:12,fontWeight:700,color:"#818cf8",marginBottom:6}}>Dwelling-Unit Ventilation Run-Time Solver</div>
                <div style={{fontSize:10,color:"#94a3b8",marginBottom:8}}>Select fan setting. Recommended = lowest setting ≥ Qfan ({R(Qfan)} CFM). All fans run continuous.</div>
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  {FAN_SETTINGS.map(cfm => {
                    const meets = cfm >= Qfan && Qfan > 0;
                    const isRec = cfm === recFan && Qfan > 0;
                    const sel = Number(s.ashrae?.fanSetting) === cfm;
                    return <button key={cfm} type="button" onClick={()=>sn("ashrae","fanSetting",cfm)} style={{
                      flex:1,padding:"10px 8px",borderRadius:8,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",
                      border:sel?`2px solid ${isRec?"#22c55e":"#818cf8"}`:`1px solid ${meets?"rgba(34,197,94,.3)":"rgba(255,255,255,.1)"}`,
                      background:sel?(isRec?"rgba(34,197,94,.15)":"rgba(99,102,241,.15)"):"rgba(255,255,255,.03)",
                      color:sel?(isRec?"#22c55e":"#a5b4fc"):meets?"#86efac":"#64748b",textAlign:"center"
                    }}>
                      <div style={{fontSize:18,fontWeight:700}}>{cfm}</div>
                      <div style={{fontSize:10}}>CFM</div>
                      {isRec && <div style={{fontSize:9,marginTop:2,color:"#22c55e",fontWeight:600}}>✓ REC</div>}
                      {!meets && Qfan > 0 && <div style={{fontSize:9,marginTop:2,color:"#ef4444"}}>Below Qfan</div>}
                    </button>;
                  })}
                </div>
                {Number(s.ashrae?.fanSetting) > 0 && Qfan > 0 && (() => {
                  const fan = Number(s.ashrae.fanSetting);
                  const minPerHr = R(Qfan / fan * 60);
                  return <div style={{background:"rgba(99,102,241,.08)",borderRadius:8,padding:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <span style={{fontSize:12,color:"#cbd5e1"}}>Fan capacity</span>
                      <span style={{fontSize:14,fontWeight:700,color:"#a5b4fc",fontFamily:"'JetBrains Mono',monospace"}}>{fan} CFM</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <span style={{fontSize:12,color:"#cbd5e1"}}>Min. run-time per hour</span>
                      <span style={{fontSize:14,fontWeight:700,color:"#818cf8",fontFamily:"'JetBrains Mono',monospace"}}>{minPerHr} min/hr</span>
                    </div>
                    <div style={eq}>= Qfan ÷ fan capacity × 60<br/>= {R(Qfan)} ÷ {fan} × 60 = {minPerHr} min/hr</div>
                    <div style={{marginTop:6,fontSize:10,color:fan >= Qfan ? "#22c55e" : "#f59e0b",fontWeight:600}}>
                      {fan >= Qfan ? `✓ Continuous (60 min/hr) exceeds minimum ${minPerHr} min/hr` : `⚠ Fan setting below Qfan — does not meet requirement`}
                    </div>
                  </div>;
                })()}
              </div>

              <p style={{fontSize:9,color:"#475569",marginTop:10,textAlign:"right"}}>ASHRAE 62.2-2016 · Local Ventilation Alternative Compliance · basc.pnnl.gov/redcalc</p>
            </div>
          );
        })()}
      </Sec>

      <Sec title={`Energy Efficiency Measures (${p.measures.length})`}>
        {(()=>{
          // Auto-calculate quantities from scope data — keyed off R to Add
          const aq = {};
          const atticAdd = Number(s.attic?.addR||0);
          const atticPre = Number(s.attic?.preR||0);
          if(atticAdd > 0 && s.attic?.sqft) {
            if(atticPre <= 11) aq["Attic Insulation (0-R11)"] = Number(s.attic.sqft);
            else if(atticPre <= 19) aq["Attic Insulation (R12-19)"] = Number(s.attic.sqft);
          }
          if(Number(s.fnd?.addR||0) > 0 || (s.fnd?.preR!==undefined && Number(s.fnd.preR||0)===0 && (Number(s.fnd?.aboveSqft||0)+Number(s.fnd?.belowSqft||0))>0)) {
            const bsmt = (Number(s.fnd?.aboveSqft||0)+Number(s.fnd?.belowSqft||0));
            if(bsmt>0) aq["Basement Wall Insulation"] = bsmt;
          }
          if(s.fnd?.crawlR!==undefined && Number(s.fnd.crawlR||0)===0) {
            const crawl = (Number(s.fnd?.crawlAbove||0)+Number(s.fnd?.crawlBelow||0));
            if(crawl>0) aq["Crawl Space Wall Insulation"] = crawl;
          }
          if(Number(s.kneeWall?.addR||0) > 0 && s.kneeWall?.sqft) aq["Knee Wall Insulation"] = Number(s.kneeWall.sqft);
          const w1net = Number(s.extWall1?.addR||0) > 0 && s.extWall1?.sqft ? Math.round(Number(s.extWall1.sqft)*0.84) : 0;
          const w2net = Number(s.extWall2?.addR||0) > 0 && s.extWall2?.sqft ? Math.round(Number(s.extWall2.sqft)*0.86) : 0;
          if(w1net+w2net>0) aq["Injection Foam Walls"] = w1net+w2net;
          if(s.fnd?.bandAccess && Number(s.fnd?.bandR||0)===0 && s.fnd?.bandLnft) aq["Rim Joist Insulation"] = Number(s.fnd.bandLnft);
          if(s.fnd?.crawlBandAccess && Number(s.fnd?.crawlBandR||0)===0 && s.fnd?.crawlBandLnft) {
            aq["Rim Joist Insulation"] = (aq["Rim Joist Insulation"]||0) + Number(s.fnd.crawlBandLnft);
          }
          if(Number(s.collar?.addR||0) > 0 && s.collar?.sqft) aq["Attic Insulation (R12-19)"] = (aq["Attic Insulation (R12-19)"]||0) + Number(s.collar.sqft);
          if(Number(s.outerCeiling?.addR||0) > 0 && s.outerCeiling?.sqft) aq["Attic Insulation (R12-19)"] = (aq["Attic Insulation (R12-19)"]||0) + Number(s.outerCeiling.sqft);
          // Mechanicals = 1 each
          if(s.htg?.replaceRec) aq[s.htg?.system==="Boiler"?"Boiler Replacement":"Furnace Replacement"] = 1;
          if(s.dhw?.replaceRec) aq["Water Heater Replacement"] = 1;
          if(s.clg?.replaceRec) aq["Central AC Replacement"] = 1;
          if(s.htg?.cleanTune || (Number(s.htg?.year||0) && (new Date().getFullYear()-Number(s.htg.year))>3 && s.htg?.fuel==="Natural Gas" && !s.htg?.replaceRec && s.htg?.cleanTuneOverride!==false)) aq["Furnace Tune-Up"] = 1;
          aq["Air Sealing"] = 1;
          if(s.attic?.ductwork || s.collar?.ductwork || s.fnd?.crawlDuct) aq["Duct Sealing"] = 1;

          const mq = p.measureQty || {};
          const mu = p.measureUnchecked || {};
          const setQ = (m,v) => u({measureQty:{...mq,[m]:v}});
          const getQ = (m) => mq[m] !== undefined ? mq[m] : (aq[m] !== undefined ? String(aq[m]) : "");
          const isAuto = (m) => mq[m] === undefined && aq[m] !== undefined;
          const unit = (m) => {
            if(m.includes("Insulation") && !m.includes("Rim")) return "sqft";
            if(m.includes("Rim Joist")) return "lnft";
            if(m.includes("Foam Walls")) return "sqft";
            return "ea";
          };

          return <div style={{display:"grid",gap:4}}>
            {EE_MEASURES.map(m => {
              const inList = p.measures.includes(m);
              const autoOn = aq[m] !== undefined && !mu[m];
              const checked = inList || autoOn;
              const q = getQ(m);
              const autoQty = isAuto(m);
              const togM = () => {
                if(checked && autoOn && !inList) { u({measureUnchecked:{...mu,[m]:true}}); }
                else if(checked && inList && autoOn) { tog("measures",m); u({measureUnchecked:{...mu,[m]:true}}); }
                else if(checked && inList && !autoOn) { tog("measures",m); }
                else { const nu={...mu}; delete nu[m]; u({measureUnchecked:nu}); if(!inList) tog("measures",m); }
              };
              return <div key={m} style={{display:"flex",alignItems:"center",gap:6}}>
                <CK checked={checked} onChange={togM} label={m} color={checked?"#22c55e":null}/>
                {checked && !inList && autoOn && <span style={{fontSize:8,color:"#818cf8"}}>auto</span>}
                {checked && <div style={{display:"flex",alignItems:"center",gap:4,marginLeft:"auto"}}>
                  <input style={{...S.inp,width:70,textAlign:"center",fontSize:11,background:autoQty?"rgba(99,102,241,.08)":"",color:autoQty?"#a5b4fc":""}} inputMode="decimal" value={q} onChange={e=>{const v=e.target.value;if(v===""||/^-?\d*\.?\d*$/.test(v))setQ(m,v);}} placeholder="qty"/>
                  <span style={{fontSize:9,color:"#64748b",minWidth:28}}>{unit(m)}</span>
                  {autoQty && <span style={{fontSize:8,color:"#818cf8"}}>auto</span>}
                  {!autoQty && aq[m]!==undefined && <span style={{fontSize:8,color:"#818cf8",cursor:"pointer",textDecoration:"underline"}} onClick={()=>{const nq={...mq};delete nq[m];u({measureQty:nq});}} title="Reset to auto-calculated value">↻ auto</span>}
                </div>}
              </div>;
            })}
          </div>;
        })()}
      </Sec>
      <Sec title={`Health & Safety Measures (${p.healthSafety.length})`}>
        {(()=>{
          const aq = {};
          if(s.coNeeded && Number(s.coNeeded)>0) aq["CO Detector (Hardwired)"] = Number(s.coNeeded);
          if(s.smokeNeeded && Number(s.smokeNeeded)>0) aq["Smoke Detector (Hardwired)"] = Number(s.smokeNeeded);
          if(s.doorSweeps && Number(s.doorSweeps)>0) aq["Door Sweeps"] = Number(s.doorSweeps);
          
          if(s.dhw?.flueRepair) aq["Flue Repairs"] = 1;

          const mq = p.measureQty || {};
          const mu = p.hsUnchecked || {};
          const setQ = (m,v) => u({measureQty:{...mq,[m]:v}});
          const getQ = (m) => mq[m] !== undefined ? mq[m] : (aq[m] !== undefined ? String(aq[m]) : "");
          const isAuto = (m) => mq[m] === undefined && aq[m] !== undefined;

          return <div style={{display:"grid",gap:4}}>
            {HS_MEASURES.map(m => {
              const inList = p.healthSafety.includes(m);
              const autoOn = aq[m] !== undefined && !mu[m];
              const checked = inList || autoOn;
              const q = getQ(m);
              const autoQty = isAuto(m);
              const togM = () => {
                if(checked && autoOn && !inList) { u({hsUnchecked:{...mu,[m]:true}}); }
                else if(checked && inList && autoOn) { tog("healthSafety",m); u({hsUnchecked:{...mu,[m]:true}}); }
                else if(checked && inList && !autoOn) { tog("healthSafety",m); }
                else { const nu={...mu}; delete nu[m]; u({hsUnchecked:nu}); if(!inList) tog("healthSafety",m); }
              };
              return <div key={m} style={{display:"flex",alignItems:"center",gap:6}}>
                <CK checked={checked} onChange={togM} label={m} color={checked?"#f59e0b":null}/>
                {checked && !inList && autoOn && <span style={{fontSize:8,color:"#818cf8"}}>auto</span>}
                {checked && <div style={{display:"flex",alignItems:"center",gap:4,marginLeft:"auto"}}>
                  <input style={{...S.inp,width:70,textAlign:"center",fontSize:11,background:autoQty?"rgba(99,102,241,.08)":"",color:autoQty?"#a5b4fc":""}} inputMode="decimal" value={q} onChange={e=>{const v=e.target.value;if(v===""||/^-?\d*\.?\d*$/.test(v))setQ(m,v);}} placeholder="qty"/>
                  <span style={{fontSize:9,color:"#64748b",minWidth:20}}>ea</span>
                  {autoQty && <span style={{fontSize:8,color:"#818cf8"}}>auto</span>}
                  {!autoQty && aq[m]!==undefined && <span style={{fontSize:8,color:"#818cf8",cursor:"pointer",textDecoration:"underline"}} onClick={()=>{const nq={...mq};delete nq[m];u({measureQty:nq});}} title="Reset to auto-calculated value">↻ auto</span>}
                </div>}
              </div>;
            })}
          </div>;
        })()}
      </Sec>

      <Sec title="Notes on Work">
        <textarea style={S.ta} value={p.measureNotes} onChange={e=>u({measureNotes:e.target.value})} rows={2} placeholder="Notes on work to be performed…"/>
      </Sec>
      <Sec title="Notes on Health & Safety">
        <textarea style={S.ta} value={s.hsNotes||""} onChange={e=>ss("hsNotes",e.target.value)} rows={2} placeholder="H&S notes…"/>
      </Sec>

      <Sec title="Insulation Quantities">
        <Gr>{["Attic (0-R11)","Attic (R12-19)","Basement Wall","Crawl Space Wall","Knee Wall","Floor Above Crawl","Rim Joist","Injection Foam Walls"].map(m =>
          <F key={m} label={`${m} ${m.includes("Rim Joist")?"LnFt":"SqFt"}`} value={s.insulQty?.[m]||""} onChange={v=>ss("insulQty",{...(s.insulQty||{}),[m]:v})}/>
        )}</Gr>
        <textarea style={{...S.ta,marginTop:6}} value={s.insulNotes||""} onChange={e=>ss("insulNotes",e.target.value)} rows={2} placeholder="Insulation notes…"/>
      </Sec>

      <Sec title="Scope Variances">
        <textarea style={S.ta} value={p.scopeVariances} onChange={e=>u({scopeVariances:e.target.value})} rows={2} placeholder="Scope variances…"/>
      </Sec>

      <Sec title="RISE Submission">
        <Gr>
          <Sel label="RISE Status" value={p.riseStatus} onChange={v=>{u({riseStatus:v});onLog(`RISE → ${v}`);}} opts={["pending","approved","corrections"]}/>
          <F label="Approval Date" value={p.scopeDate} onChange={v=>u({scopeDate:v})} type="date"/>
        </Gr>
        <div style={{marginTop:8}}><CK checked={p.scopeApproved} onChange={v=>{u({scopeApproved:v});if(v)onLog("Scope approved");}} label="Scope Approved"/></div>
        <div style={{marginTop:8}}><textarea style={S.ta} value={p.scopeNotes} onChange={e=>u({scopeNotes:e.target.value})} rows={2} placeholder="Conditions, corrections…"/></div>
      </Sec>
      <Sec title="Mechanical Replacement">
        <CK checked={p.mechNeeded} onChange={v=>u({mechNeeded:v})} label="Replacement needed (Decision Tree)"/>
        {p.mechNeeded && (
          <div style={{marginTop:8}}>
            <Gr><Sel label="Status" value={p.mechStatus} onChange={v=>{u({mechStatus:v});onLog(`Mech → ${v}`);}} opts={["requested","approved","denied"]}/><F label="Date" value={p.mechDate} onChange={v=>u({mechDate:v})} type="date"/></Gr>
            <textarea style={{...S.ta,marginTop:6}} value={p.mechNotes} onChange={e=>u({mechNotes:e.target.value})} rows={2} placeholder="Notes…"/>
          </div>
        )}
      </Sec>
    </div>
  );
}

function InstallTab({p,u,onLog,user,role}) {
  const fi = p.fi || {};
  const sf = (k,f,v) => u({fi:{...fi,safety:{...(fi.safety||{}),[k]:{...(fi.safety?.[k]||{}),[f]:v}}}});
  const uf = (k,v) => u({fi:{...fi,[k]:v}});
  const s = p.scope2026 || {};
  const a = p.audit || {};
  const co = p.changeOrders || [];
  const [prev, setPrev] = useState(null);
  const [coText, setCoText] = useState("");

  // ── Post Photos ──
  const postSections = Object.entries(PHOTO_SECTIONS).filter(([cat]) => cat.includes("(Post)"));
  const postItems = postSections.flatMap(([cat,items])=>items.map(i=>({...i,cat})));
  const postTaken = postItems.filter(i=>hasPhoto(p.photos,i.id)).length;

  const handleFile = (id, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (file.type === "image/gif") {
        const existing = getPhotos(p.photos, id);
        const newEntry = {d:e.target.result,at:new Date().toISOString(),by:user};
        u({photos:{...p.photos,[id]:[...existing, newEntry]}});
        if(onLog) onLog(`📸 ${postItems.find(x=>x.id===id)?.l||id} (${existing.length+1})`);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const maxW = 1600;
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        const existing = getPhotos(p.photos, id);
        const newEntry = {d:c.toDataURL("image/jpeg",0.7),at:new Date().toISOString(),by:user};
        u({photos:{...p.photos,[id]:[...existing, newEntry]}});
        if(onLog) onLog(`📸 ${postItems.find(x=>x.id===id)?.l||id} (${existing.length+1})`);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // ── RED Calc — same logic as scope tab, uses post CFM50 ──
  const buildRedCalc = (usePostQ50) => {
    const baseSqft = Number(p.sqft) || 0;
    const finBasement = s.fnd?.type === "Finished" ? (Number(s.fnd?.aboveSqft)||0) + (Number(s.fnd?.belowSqft)||0) : 0;
    const Afl = baseSqft + finBasement;
    const Nbr = Number(s.bedrooms) || 0;
    const Q50 = usePostQ50 ? (Number(p.postCFM50) || 0) : (Number(p.preCFM50) || 0);
    const st = Number(p.stories) || 1;
    const H = st >= 2 ? 16 : st >= 1.5 ? 14 : 8;
    const Hr = 8.202; const wsf = 0.56;

    // Same fan flow sources as scope tab
    const kRaw = s.ashrae?.kitchenCFM ?? a.kitchenFan ?? "";
    const b1Raw = s.ashrae?.bath1CFM ?? a.bathFan1 ?? "";
    const b2Raw = s.ashrae?.bath2CFM ?? a.bathFan2 ?? "";
    const b3Raw = s.ashrae?.bath3CFM ?? a.bathFan3 ?? "";
    const kPresent = String(kRaw).trim() !== "";
    const b1Present = String(b1Raw).trim() !== "";
    const b2Present = String(b2Raw).trim() !== "";
    const b3Present = String(b3Raw).trim() !== "";
    const kCFM = Number(kRaw) || 0; const b1 = Number(b1Raw) || 0;
    const b2 = Number(b2Raw) || 0; const b3 = Number(b3Raw) || 0;
    const kWin = s.ashrae?.kWin || false;
    const b1Win = s.ashrae?.b1Win || false;
    const b2Win = s.ashrae?.b2Win || false;
    const b3Win = s.ashrae?.b3Win || false;

    // Infiltration credit
    const Qinf = Q50 > 0 ? 0.052 * Q50 * wsf * Math.pow(H / 8.2, 0.4) : 0;
    const Qtot = (Afl > 0) ? 0.03 * Afl + 7.5 * (Nbr + 1) : 0;
    const kReq = kPresent ? 100 : 0;
    const b1Req = b1Present ? 50 : 0;
    const b2Req = b2Present ? 50 : 0;
    const b3Req = b3Present ? 50 : 0;
    const kDef = !kPresent ? 0 : Math.max(0, kReq - (kWin ? 20 : kCFM));
    const b1Def = !b1Present ? 0 : Math.max(0, b1Req - (b1Win ? 20 : b1));
    const b2Def = !b2Present ? 0 : Math.max(0, b2Req - (b2Win ? 20 : b2));
    const b3Def = !b3Present ? 0 : Math.max(0, b3Req - (b3Win ? 20 : b3));
    const totalDef = kDef + b1Def + b2Def + b3Def;
    const supplement = totalDef * 0.25;
    const Qfan = Qtot + supplement - Qinf;
    const FAN_SETTINGS = [50, 80, 110];
    const recFan = FAN_SETTINGS.find(f => f >= Qfan) || FAN_SETTINGS[FAN_SETTINGS.length - 1];
    const R = v => Math.round(v * 100) / 100;
    const Ri = v => Math.round(v);
    return { Afl, Nbr, Q50, H, Hr, wsf, st, Qinf, Qtot, totalDef, supplement, Qfan, FAN_SETTINGS, recFan, R, Ri, baseSqft, finBasement, kCFM, b1, b2, b3, kPresent, b1Present, b2Present, b3Present, kWin, b1Win, b2Win, b3Win, kReq, b1Req, b2Req, b3Req, kDef, b1Def, b2Def, b3Def };
  };

  // ── Change Orders ──
  const addCO = () => {
    if (!coText.trim()) return;
    const newCO = { id: Date.now().toString(36), text: coText.trim(), by: user, at: new Date().toISOString(), status: "pending", response: "" };
    u({ changeOrders: [...co, newCO] });
    if (onLog) onLog(`📝 Change order requested: ${coText.trim().slice(0,50)}…`);
    setCoText("");
  };
  const updateCO = (id, fields) => {
    u({ changeOrders: co.map(c => c.id === id ? { ...c, ...fields } : c) });
    if (onLog && fields.status) onLog(`Change order ${fields.status}: ${co.find(c=>c.id===id)?.text?.slice(0,40)}…`);
  };

  // ── Print HTML ──
  const getInstallHTML = () => {
    const rc = buildRedCalc(true);
    const R = rc.R;
    const safetyRows = FI_SAFETY.map(c => {
      const r = fi.safety?.[c.k] || {};
      const cls = r.pf==="P"?"pass":r.pf==="F"?"fail":"na";
      return `<div class="row"><span class="lbl">${c.l}</span><span>${c.r&&r.reading?r.reading+" "+c.u+" · ":""}<span class="${cls}">${r.pf||"—"}</span>${r.fu?" ⚠ F/U":""}</span></div>`;
    }).join("");
    const mq2 = p.measureQty||{};
    const measList = p.measures.length ? `<table style="width:100%;border-collapse:collapse;font-size:9px;margin-top:4px">\n<tr style="background:#f0fdf4;"><th style="text-align:left;padding:2px 5px;border:1px solid #ccc">Measure</th><th style="text-align:right;padding:2px 5px;border:1px solid #ccc">Qty</th><th style="padding:2px 5px;border:1px solid #ccc">Unit</th></tr>\n${p.measures.map(m=>`<tr><td style="padding:2px 5px;border:1px solid #ddd">${m}</td><td style="text-align:right;padding:2px 5px;border:1px solid #ddd">${getResolvedQty(p,m)||"—"}</td><td style="padding:2px 5px;border:1px solid #ddd">${measUnit(m)}</td></tr>`).join("")}\n</table>` : "<em>None</em>";
    const hsList = p.healthSafety.length ? `<table style="width:100%;border-collapse:collapse;font-size:9px;margin-top:4px">\n<tr style="background:#fffbeb;"><th style="text-align:left;padding:2px 5px;border:1px solid #ccc">Measure</th><th style="text-align:right;padding:2px 5px;border:1px solid #ccc">Qty</th><th style="padding:2px 5px;border:1px solid #ccc">Unit</th></tr>\n${p.healthSafety.map(m=>`<tr><td style="padding:2px 5px;border:1px solid #ddd">${m}</td><td style="text-align:right;padding:2px 5px;border:1px solid #ddd">${getResolvedQty(p,m)||"—"}</td><td style="padding:2px 5px;border:1px solid #ddd">ea</td></tr>`).join("")}\n</table>` : "<em>None</em>";
    const coRows = co.map(c=>`<div class="row"><span class="lbl">${c.text}</span><span class="${c.status==="approved"?"pass":c.status==="denied"?"fail":"na"}">${c.status.toUpperCase()}${c.response?" — "+c.response:""}</span></div>`).join("");
    const fan = Number(fi.postFanSetting) || 0;

    const body = `
      <div class="sec"><h3>Scope of Work</h3>
        <div style="margin-bottom:6px"><strong>Energy Efficiency:</strong><br/>${measList}</div>
        <div style="margin-bottom:6px"><strong>Health & Safety:</strong><br/>${hsList}</div>
        ${p.measureNotes?`<div style="margin-bottom:4px"><strong>Notes:</strong> ${p.measureNotes}</div>`:""}
      </div>
      ${co.length?`<div class="sec"><h3>Change Orders</h3>${coRows}</div>`:""}
      <div class="sec"><h3>Post-Work Blower Door</h3><div class="grid">
        <div class="row"><span class="lbl">Pre CFM50</span><span class="val">${p.preCFM50||"—"}</span></div>
        <div class="row"><span class="lbl">Post CFM50</span><span class="val">${p.postCFM50||"—"}</span></div>
        ${p.preCFM50&&p.postCFM50?`<div class="row"><span class="lbl">Reduction</span><span class="val">${Math.round(((p.preCFM50-p.postCFM50)/p.preCFM50)*100)}%</span></div>`:""}
      </div></div>
      <div class="sec"><h3>Post-Work ASHRAE 62.2-2016</h3><div class="grid">
        <div class="row"><span class="lbl">Floor area</span><span class="val">${rc.Afl} ft²</span></div>
        <div class="row"><span class="lbl">Post Q50</span><span class="val">${rc.Q50} CFM</span></div>
        <div class="row"><span class="lbl">Qinf</span><span class="val">${R(rc.Qinf)} CFM</span></div>
        <div class="row"><span class="lbl">Qtot</span><span class="val">${R(rc.Qtot)} CFM</span></div>
        <div class="row"><span class="lbl">Supplement</span><span class="val">${R(rc.supplement)} CFM</span></div>
        <div class="row" style="border-top:2px solid #4338ca;padding-top:4px;margin-top:4px"><span style="font-weight:700">Qfan (post)</span><span style="font-weight:700;color:#4338ca;font-size:14px">${R(rc.Qfan)} CFM</span></div>
        ${fan?`<div class="row"><span class="lbl">Fan: ${fan} CFM · Run-time: ${R(rc.Qfan/fan*60)} min/hr</span></div>`:""}
      </div></div>
      <div class="sec"><h3>Health & Safety Checks</h3>${safetyRows}</div>
      <div class="sec"><h3>Status</h3>
        <div class="row"><span class="lbl">Final Passed</span><span class="val">${p.finalPassed?"✅ Yes":"No"}</span></div>
        <div class="row"><span class="lbl">Customer Sign-off</span><span class="val">${p.customerSignoff?"✅ Yes":"No"}</span></div>
      </div>`;
    return formPrintHTML("Install Completion & Final Inspection", p, body, fi.inspectorSig);
  };

  // Photo preview
  if (prev) {
    const arr = getPhotos(p.photos, prev.id);
    const ph = arr[prev.idx]; const it = postItems.find(x=>x.id===prev.id);
    return (
      <div style={S.camOv}>
        <div style={S.camH}>
          <button style={{...S.back,fontSize:18}} onClick={()=>setPrev(null)}>← Back</button>
          <div style={{flex:1,textAlign:"center",fontWeight:600,fontSize:14}}>{it?.l} {arr.length>1?`(${prev.idx+1}/${arr.length})`:""}</div>
          <button style={{...S.ghost,color:"#ef4444",borderColor:"#ef4444",padding:"4px 10px"}} onClick={()=>{
            const remaining = arr.filter((_,i)=>i!==prev.idx);
            u({photos:{...p.photos,[prev.id]:remaining.length?remaining:undefined}});
            if(onLog)onLog(`🗑️ Removed ${it?.l||prev.id}`);setPrev(null);
          }}>Delete</button>
        </div>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:"#000",padding:8,position:"relative"}}>
          {ph?.d && <img src={ph.d} style={{maxWidth:"100%",maxHeight:"80vh",borderRadius:8}} alt=""/>}
          {arr.length > 1 && prev.idx > 0 && <button onClick={()=>setPrev({...prev,idx:prev.idx-1})} style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,.5)",color:"#fff",border:"none",borderRadius:"50%",width:36,height:36,fontSize:18,cursor:"pointer"}}>‹</button>}
          {arr.length > 1 && prev.idx < arr.length-1 && <button onClick={()=>setPrev({...prev,idx:prev.idx+1})} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,.5)",color:"#fff",border:"none",borderRadius:"50%",width:36,height:36,fontSize:18,cursor:"pointer"}}>›</button>}
        </div>
        <div style={{padding:12,textAlign:"center",fontSize:11,color:"#94a3b8"}}>{ph?.by} · {ph?.at&&new Date(ph.at).toLocaleString()}</div>
      </div>
    );
  }

  const rcPost = buildRedCalc(true);
  const rcPre = buildRedCalc(false);
  const red = p.preCFM50 && p.postCFM50 ? Math.round(((p.preCFM50-p.postCFM50)/p.preCFM50)*100) : null;
  const {R,Ri} = rcPost;

  return (
    <div>
      {/* ── HEADER + PRINT ── */}
      <Sec title="🏗️ Install Completion">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <p style={{fontSize:11,color:"#94a3b8",margin:0}}>Complete all sections before leaving the job site.</p>
          <PrintBtn onClick={()=>savePrint(getInstallHTML())}/>
        </div>
      </Sec>

      {/* ── SCOPE OF WORK (read-only from scope tab) ── */}
      <Sec title="Scope of Work">
        <div style={{fontSize:10,color:"#64748b",marginBottom:8}}>Approved scope from assessment. Request a change order below if modifications are needed.</div>
        {p.measures.length > 0 && <>
          <div style={{fontSize:11,fontWeight:700,color:"#22c55e",marginBottom:4}}>Energy Efficiency Measures ({p.measures.length})</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>{p.measures.map(m=><span key={m} style={{padding:"3px 8px",borderRadius:5,border:"1px solid rgba(34,197,94,.3)",background:"rgba(34,197,94,.08)",color:"#86efac",fontSize:10}}>✓ {m}{getResolvedQty(p,m)?" ("+getResolvedQty(p,m)+")":""}</span>)}</div>
        </>}
        {p.healthSafety.length > 0 && <>
          <div style={{fontSize:11,fontWeight:700,color:"#f59e0b",marginBottom:4}}>Health & Safety Measures ({p.healthSafety.length})</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>{p.healthSafety.map(m=><span key={m} style={{padding:"3px 8px",borderRadius:5,border:"1px solid rgba(245,158,11,.3)",background:"rgba(245,158,11,.08)",color:"#fbbf24",fontSize:10}}>✓ {m}</span>)}</div>
        </>}
        {p.measureNotes && <div style={{fontSize:11,color:"#94a3b8",padding:8,background:"rgba(255,255,255,.03)",borderRadius:6,marginBottom:6}}><span style={{color:"#64748b",fontWeight:600}}>Notes:</span> {p.measureNotes}</div>}
        {s.insulQty && Object.entries(s.insulQty).some(([,v])=>v) && <>
          <div style={{fontSize:11,fontWeight:700,color:"#818cf8",marginBottom:4,marginTop:6}}>Insulation Quantities</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"2px 12px",fontSize:11}}>
            {Object.entries(s.insulQty).filter(([,v])=>v).map(([m,v])=><div key={m} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
              <span style={{color:"#94a3b8"}}>{m}</span><span style={{fontWeight:600,color:"#e2e8f0"}}>{v} {m.includes("Rim Joist")?"LnFt":"SqFt"}</span>
            </div>)}
          </div>
        </>}
        {p.measures.length === 0 && p.healthSafety.length === 0 && <p style={{color:"#64748b",fontSize:12,textAlign:"center",padding:12}}>No measures selected in scope yet.</p>}
      </Sec>

      {/* ── CUSTOMER SCOPE AUTHORIZATION ── */}
      <Sec title="Customer Scope Authorization">
        <p style={{fontSize:10,color:"#64748b",marginBottom:6}}>Customer acknowledges and authorizes the scope of work listed above.</p>
        <SigPad label="Customer Signature — Scope Authorization" value={fi.scopeAuthSig||""} onChange={v=>uf("scopeAuthSig",v)}/>
      </Sec>

      {/* ── CHANGE ORDERS ── */}
      <Sec title={`Change Orders (${co.length})`}>
        <div style={{fontSize:10,color:"#64748b",marginBottom:8}}>Request scope changes from the field. Admin/Compliance will approve or deny.</div>
        <div style={{display:"flex",gap:6,marginBottom:8}}>
          <input style={{...S.inp,flex:1}} value={coText} onChange={e=>setCoText(e.target.value)} placeholder="Describe the scope change needed…" onKeyDown={e=>{if(e.key==="Enter")addCO();}}/>
          <button type="button" style={{...S.ghost,borderColor:"#f97316",color:"#f97316",padding:"6px 12px",whiteSpace:"nowrap"}} onClick={addCO}>+ Request</button>
        </div>
        {co.map(c => (
          <div key={c.id} style={{background:c.status==="approved"?"rgba(34,197,94,.06)":c.status==="denied"?"rgba(239,68,68,.06)":"rgba(255,255,255,.03)",border:`1px solid ${c.status==="approved"?"rgba(34,197,94,.2)":c.status==="denied"?"rgba(239,68,68,.2)":"rgba(255,255,255,.08)"}`,borderRadius:8,padding:10,marginBottom:6}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
              <div style={{flex:1,fontSize:12,color:"#e2e8f0"}}>{c.text}</div>
              <span style={{fontSize:9,padding:"2px 6px",borderRadius:4,fontWeight:700,marginLeft:8,flexShrink:0,
                background:c.status==="approved"?"rgba(34,197,94,.15)":c.status==="denied"?"rgba(239,68,68,.15)":"rgba(245,158,11,.15)",
                color:c.status==="approved"?"#22c55e":c.status==="denied"?"#ef4444":"#f59e0b"
              }}>{c.status.toUpperCase()}</span>
            </div>
            <div style={{fontSize:9,color:"#64748b"}}>{c.by} · {new Date(c.at).toLocaleString()}</div>
            {c.response && <div style={{fontSize:11,color:c.status==="denied"?"#fca5a5":"#86efac",marginTop:4,padding:"4px 8px",background:"rgba(255,255,255,.03)",borderRadius:4}}>{c.response}</div>}
            {c.status === "pending" && (role === "admin" || role === "scope") && (
              <div style={{marginTop:6,display:"flex",gap:4,alignItems:"center"}}>
                <input style={{...S.inp,flex:1,fontSize:11}} placeholder="Response / explanation…" value={c._resp||""} onChange={e=>u({changeOrders:co.map(x=>x.id===c.id?{...x,_resp:e.target.value}:x)})}/>
                <button type="button" style={{padding:"4px 8px",borderRadius:5,border:"1px solid rgba(34,197,94,.4)",background:"rgba(34,197,94,.1)",color:"#22c55e",fontSize:10,fontWeight:700,cursor:"pointer"}} onClick={()=>updateCO(c.id,{status:"approved",response:c._resp||""})}>Approve</button>
                <button type="button" style={{padding:"4px 8px",borderRadius:5,border:"1px solid rgba(239,68,68,.4)",background:"rgba(239,68,68,.1)",color:"#ef4444",fontSize:10,fontWeight:700,cursor:"pointer"}} onClick={()=>updateCO(c.id,{status:"denied",response:c._resp||""})}>Deny</button>
              </div>
            )}
            {c.status === "pending" && role === "installer" && (
              <div style={{marginTop:4,fontSize:10,color:"#f59e0b",fontStyle:"italic"}}>⏳ Awaiting approval from Scope/Admin</div>
            )}
          </div>
        ))}
        {co.length === 0 && <p style={{color:"#475569",fontSize:11,textAlign:"center"}}>No change orders yet.</p>}
      </Sec>

      {/* ── POST PHOTOS ── */}
      <Sec title={<span>Post-Install Photos <span style={{fontWeight:400,color:"#94a3b8",fontFamily:"'JetBrains Mono',monospace"}}>{postTaken}/{postItems.length}</span></span>}>
        <div style={S.prog}><div style={{...S.progF,width:`${postItems.length?(postTaken/postItems.length)*100:0}%`,background:"linear-gradient(90deg,#f97316,#eab308)"}}/></div>
        {postSections.map(([cat,items]) => (
          <div key={cat} style={{marginTop:10}}>
            <div style={{fontSize:11,fontWeight:700,color:"#f97316",marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>{cat}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:6}}>
              {items.map(item => {
                const arr = getPhotos(p.photos, item.id);
                const has = arr.length > 0;
                return <div key={item.id} style={{background:has?"rgba(34,197,94,.08)":"rgba(255,255,255,.03)",border:`1px solid ${has?"rgba(34,197,94,.3)":"rgba(255,255,255,.08)"}`,borderRadius:8,overflow:"hidden"}}>
                  {has ? <div style={{position:"relative",cursor:"pointer"}} onClick={()=>setPrev({id:item.id,idx:0})}>
                    <img src={arr[0].d} style={{width:"100%",height:70,objectFit:"cover"}} alt=""/>
                    {arr.length>1 && <span style={{position:"absolute",top:2,right:2,background:"rgba(0,0,0,.7)",color:"#fff",fontSize:9,padding:"1px 4px",borderRadius:4}}>{arr.length}</span>}
                  </div> : <div style={{height:70,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <label style={{fontSize:10,color:"#64748b",cursor:"pointer",textAlign:"center",padding:4}}>📸 Tap<input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>handleFile(item.id,e.target.files?.[0])}/></label>
                  </div>}
                  <div style={{padding:"4px 6px",fontSize:9,color:"#94a3b8",borderTop:"1px solid rgba(255,255,255,.05)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span>{item.l}{has&&" ✓"}</span>
                    {has && <label style={{fontSize:10,color:"#818cf8",cursor:"pointer"}}>＋<input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>handleFile(item.id,e.target.files?.[0])}/></label>}
                  </div>
                </div>;
              })}
            </div>
          </div>
        ))}
      </Sec>

      {/* ── BLOWER DOOR ── */}
      <Sec title="Post-Work Blower Door">
        <Gr>
          <F label="Pre CFM50" value={p.preCFM50} onChange={v=>u({preCFM50:v})} num/>
          <F label="Post CFM50" value={p.postCFM50} onChange={v=>u({postCFM50:v})} num/>
          <F label="Pre CFM25" value={p.preCFM25} onChange={v=>u({preCFM25:v})} num/>
          <F label="Post CFM25" value={p.postCFM25} onChange={v=>u({postCFM25:v})} num/>
        </Gr>
        {red !== null && <div style={S.calc}><span>Air Seal Reduction: <b>{red}%</b></span><span style={{color:red>=25?"#22c55e":"#f59e0b",marginLeft:10}}>{red>=25?"✓ Meets 25%":"⚠ Below 25%"}</span></div>}
        {p.preCFM25 && p.postCFM25 && (()=>{const r=Math.round((Number(p.preCFM25)-Number(p.postCFM25))/Number(p.preCFM25)*100);return <div style={S.calc}><span>Duct Leakage Reduction: <b>{r}%</b> ({p.preCFM25}→{p.postCFM25} CFM25)</span></div>;})()}
      </Sec>

      {/* ── POST-WORK RED CALC ── */}
      <Sec title="Post-Work ASHRAE 62.2-2016 — RED Calc">
        {!rcPost.Q50 ? <p style={{color:"#64748b",fontSize:12,textAlign:"center",padding:12}}>Enter Post CFM50 above to calculate.</p> : (() => {
          const {Afl,Nbr,Q50,H,Hr,wsf,st,Qinf,Qtot,totalDef,supplement,Qfan,FAN_SETTINGS,recFan,baseSqft,finBasement,kCFM,b1,b2,b3,kPresent,b1Present,b2Present,b3Present,kWin,b1Win,b2Win,b3Win,kReq,b1Req,b2Req,b3Req,kDef,b1Def,b2Def,b3Def} = rcPost;
          const hdr = {fontSize:13,fontWeight:700,color:"#818cf8",margin:"14px 0 6px",borderBottom:"1px solid rgba(99,102,241,.25)",paddingBottom:4};
          const row = {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",fontSize:12,borderBottom:"1px solid rgba(255,255,255,.04)"};
          const lbl = {color:"#94a3b8",flex:1};
          const val = {fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:"#e2e8f0",textAlign:"right"};
          const eq = {fontSize:10,color:"#475569",padding:"1px 0 5px 12px",fontFamily:"'JetBrains Mono',monospace",borderLeft:"2px solid rgba(99,102,241,.15)"};
          const autoBox = {background:"rgba(99,102,241,.06)",borderRadius:6,padding:"6px 10px",fontFamily:"'JetBrains Mono',monospace",fontWeight:600,fontSize:13,color:"#e2e8f0",textAlign:"center"};
          const autoSub = {fontSize:9,color:"#64748b",textAlign:"center",marginTop:2};
          const resultBox = {background:"rgba(168,85,247,.08)",border:"2px solid rgba(168,85,247,.3)",borderRadius:8,padding:12,marginTop:8};

          return <div>
            {/* Configuration */}
            <div style={hdr}>Configuration</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 16px",fontSize:12}}>
              <div style={row}><span style={lbl}>Construction</span><span style={val}>Existing</span></div>
              <div style={row}><span style={lbl}>Dwelling unit</span><span style={val}>Detached</span></div>
              <div style={row}><span style={lbl}>Infiltration credit</span><span style={val}>Yes</span></div>
              <div style={row}><span style={lbl}>Alt. compliance</span><span style={val}>Yes</span></div>
              <div style={row}><span style={lbl}>Weather station</span><span style={val}>Chicago Midway AP</span></div>
              <div style={row}><span style={lbl}>wsf [1/hr]</span><span style={{...val,color:"#818cf8"}}>{wsf}</span></div>
            </div>

            {/* Building Inputs */}
            <div style={hdr}>Building Inputs (Post-Work)</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
              <div><div style={{fontSize:10,color:"#94a3b8",marginBottom:3}}>Floor area [ft²]</div><div style={autoBox}>{Afl||"—"}</div><div style={autoSub}>{finBasement>0?`${baseSqft} + ${finBasement} fin. bsmt`:"← Sq Footage"}</div></div>
              <div><div style={{fontSize:10,color:"#94a3b8",marginBottom:3}}>Nbr (bedrooms)</div><div style={autoBox}>{Nbr}</div><div style={autoSub}>Occupants = Nbr + 1 = {Nbr + 1}</div></div>
              <div><div style={{fontSize:10,color:"#94a3b8",marginBottom:3}}>Height [ft]</div><div style={autoBox}>{H}</div><div style={autoSub}>{st>=2?"2-story":"1"+(st>=1.5?".5":"")+"-story"}</div></div>
              <div><div style={{fontSize:10,color:"#94a3b8",marginBottom:3}}>Post Q50 [CFM]</div><div style={{...autoBox,color:"#22c55e"}}>{Q50}</div><div style={autoSub}>← Post blower door</div></div>
            </div>

            {/* Local Ventilation — read-only from scope */}
            <div style={hdr}>Local Ventilation — Alternative Compliance <span style={{fontSize:9,fontWeight:400,color:"#64748b"}}>(from Scope)</span></div>
            <div style={{fontSize:9,color:"#64748b",marginBottom:2}}>Blank = no fan = no requirement. Openable window = 20 CFM credit. Kitchen: 100 CFM · Bath: 50 CFM (intermittent rates)</div>
            <div style={{display:"grid",gridTemplateColumns:"80px 1fr 60px 50px 55px",gap:"2px 6px",fontSize:11,alignItems:"center"}}>
              <span style={{fontWeight:600,color:"#64748b"}}></span>
              <span style={{fontWeight:600,color:"#64748b",textAlign:"center"}}>Fan Flow [CFM]</span>
              <span style={{fontWeight:600,color:"#64748b",textAlign:"center",fontSize:9}}>Window</span>
              <span style={{fontWeight:600,color:"#64748b",textAlign:"center"}}>Req'd</span>
              <span style={{fontWeight:600,color:"#64748b",textAlign:"center"}}>Deficit</span>
            </div>
            {[
              {n:"Kitchen",v:kCFM,w:kWin,r:kReq,d:kDef,present:kPresent},
              {n:"Bath #1",v:b1,w:b1Win,r:b1Req,d:b1Def,present:b1Present},
              {n:"Bath #2",v:b2,w:b2Win,r:b2Req,d:b2Def,present:b2Present},
              {n:"Bath #3",v:b3,w:b3Win,r:b3Req,d:b3Def,present:b3Present},
            ].map(f=>(
              <div key={f.n} style={{display:"grid",gridTemplateColumns:"80px 1fr 60px 50px 55px",gap:"2px 6px",alignItems:"center",marginBottom:2}}>
                <span style={{fontSize:12,color:"#cbd5e1"}}>{f.n}</span>
                <div style={{textAlign:"center",fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:f.present?"#e2e8f0":"#475569",background:"rgba(255,255,255,.03)",borderRadius:4,padding:"4px 6px"}}>{f.present?f.v:"—"}</div>
                <div style={{textAlign:"center",fontSize:11,color:f.w?"#818cf8":"#475569"}}>{f.w?"✓":"—"}</div>
                <div style={{textAlign:"center",fontSize:11,color:f.present?"#64748b":"#475569"}}>{f.present?f.r:"—"}</div>
                <div style={{textAlign:"center",fontSize:13,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:!f.present?"#475569":f.d>0?"#f59e0b":"#22c55e"}}>{f.present?f.d:"—"}</div>
              </div>
            ))}
            <div style={{display:"grid",gridTemplateColumns:"80px 1fr 60px 50px 55px",gap:"2px 6px",borderTop:"1px solid rgba(255,255,255,.1)",paddingTop:4,marginTop:4}}>
              <span style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>Total</span>
              <span></span><span></span><span></span>
              <div style={{textAlign:"center",fontSize:14,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:totalDef>0?"#f59e0b":"#22c55e"}}>{Ri(totalDef)}</div>
            </div>

            {/* Results with full equations */}
            <div style={resultBox}>
              <div style={{fontSize:13,fontWeight:700,color:"#a855f7",marginBottom:10}}>Post-Work Ventilation Results</div>

              <div style={row}><span style={lbl}>Infiltration credit, Qinf [CFM]</span><span style={val}>{R(Qinf)}</span></div>
              <div style={eq}>= 0.052 × Q50 × wsf × (H / 8.2)^0.4<br/>= 0.052 × {Q50} × {wsf} × ({H} / 8.2)^0.4</div>

              <div style={row}><span style={lbl}>Total required ventilation rate, Qtot [CFM]</span><span style={val}>{R(Qtot)}</span></div>
              <div style={eq}>= 0.03 × Afl + 7.5 × (Nbr + 1)<br/>= 0.03 × {Afl} + 7.5 × ({Nbr} + 1)<br/>= {R(0.03*Afl)} + {R(7.5*(Nbr+1))}</div>

              <div style={row}><span style={lbl}>Total local ventilation deficit [CFM]</span><span style={val}>{Ri(totalDef)}</span></div>
              <div style={eq}>= Σ max(0, req − measured) per fan<br/>Kitchen {kReq} − {kCFM} = {kDef} · Bath1 {b1Req} − {b1} = {b1Def} · Bath2 {b2Req} − {b2} = {b2Def} · Bath3 {b3Req} − {b3} = {b3Def}</div>

              <div style={row}><span style={lbl}>Alternative compliance supplement [CFM]</span><span style={val}>{R(supplement)}</span></div>
              <div style={eq}>= totalDeficit × 0.25 (intermittent → continuous)<br/>= {Ri(totalDef)} × 0.25</div>

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0 4px",borderTop:"2px solid rgba(168,85,247,.4)",marginTop:8}}>
                <span style={{fontWeight:700,color:"#e2e8f0",fontSize:13}}>Required mech. ventilation, Qfan [CFM]</span>
                <span style={{fontWeight:800,color:"#a855f7",fontSize:18,fontFamily:"'JetBrains Mono',monospace"}}>{R(Qfan)}</span>
              </div>
              <div style={eq}>= Qtot + supplement − Qinf<br/>= {R(Qtot)} + {R(supplement)} − {R(Qinf)}</div>
              {rcPre.Qfan > 0 && <div style={{fontSize:10,color:"#64748b",marginTop:4,padding:"4px 8px",background:"rgba(255,255,255,.03)",borderRadius:4}}>Pre-work Qfan was {R(rcPre.Qfan)} CFM · Δ {R(Qfan-rcPre.Qfan)} CFM</div>}
            </div>

            {/* Fan Setting + Run-Time Solver */}
            <div style={{background:"rgba(99,102,241,.04)",border:"1px solid rgba(99,102,241,.2)",borderRadius:8,padding:10,marginTop:10}}>
              <div style={{fontSize:12,fontWeight:700,color:"#818cf8",marginBottom:6}}>Dwelling-Unit Ventilation Run-Time Solver</div>
              <div style={{fontSize:10,color:"#94a3b8",marginBottom:8}}>Select fan setting. Recommended = lowest setting ≥ Qfan ({R(Qfan)} CFM). All fans run continuous.</div>
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                {FAN_SETTINGS.map(cfm => {
                  const meets = cfm >= Qfan && Qfan > 0;
                  const isRec = cfm === recFan && Qfan > 0;
                  const sel = Number(fi.postFanSetting) === cfm;
                  return <button key={cfm} type="button" onClick={()=>uf("postFanSetting",cfm)} style={{
                    flex:1,padding:"10px 8px",borderRadius:8,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",
                    border:sel?`2px solid ${isRec?"#22c55e":"#818cf8"}`:`1px solid ${meets?"rgba(34,197,94,.3)":"rgba(255,255,255,.1)"}`,
                    background:sel?(isRec?"rgba(34,197,94,.15)":"rgba(99,102,241,.15)"):"rgba(255,255,255,.03)",
                    color:sel?(isRec?"#22c55e":"#a5b4fc"):meets?"#86efac":"#64748b",textAlign:"center"
                  }}>
                    <div style={{fontSize:18,fontWeight:700}}>{cfm}</div>
                    <div style={{fontSize:10}}>CFM</div>
                    {isRec && <div style={{fontSize:9,marginTop:2,color:"#22c55e",fontWeight:600}}>✓ REC</div>}
                    {!meets && Qfan > 0 && <div style={{fontSize:9,marginTop:2,color:"#ef4444"}}>Below Qfan</div>}
                  </button>;
                })}
              </div>
              {Number(fi.postFanSetting) > 0 && Qfan > 0 && (() => {
                const fan = Number(fi.postFanSetting);
                const minPerHr = R(Qfan / fan * 60);
                return <div style={{background:"rgba(99,102,241,.08)",borderRadius:8,padding:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{fontSize:12,color:"#cbd5e1"}}>Fan capacity</span>
                    <span style={{fontSize:14,fontWeight:700,color:"#a5b4fc",fontFamily:"'JetBrains Mono',monospace"}}>{fan} CFM</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{fontSize:12,color:"#cbd5e1"}}>Min. run-time per hour</span>
                    <span style={{fontSize:14,fontWeight:700,color:"#818cf8",fontFamily:"'JetBrains Mono',monospace"}}>{minPerHr} min/hr</span>
                  </div>
                  <div style={eq}>= Qfan ÷ fan capacity × 60<br/>= {R(Qfan)} ÷ {fan} × 60 = {minPerHr} min/hr</div>
                  <div style={{marginTop:6,fontSize:10,color:fan >= Qfan?"#22c55e":"#f59e0b",fontWeight:600}}>
                    {fan >= Qfan?`✓ Continuous (60 min/hr) exceeds minimum ${minPerHr} min/hr`:`⚠ Fan setting below Qfan — does not meet requirement`}
                  </div>
                </div>;
              })()}
            </div>
            <p style={{fontSize:9,color:"#475569",marginTop:10,textAlign:"right"}}>ASHRAE 62.2-2016 · Local Ventilation Alternative Compliance · basc.pnnl.gov/redcalc</p>
          </div>;
        })()}
      </Sec>

      {/* ── CAZ / HEALTH & SAFETY ── */}
      <Sec title="Health & Safety Checks">
        {FI_SAFETY.map(c => {
          const r = fi.safety?.[c.k] || {};
          return (
            <div key={c.k} style={S.cazR}>
              <span style={{flex:1,fontSize:12,minWidth:110}}>{c.l}</span>
              {c.r && <input style={{...S.inp,width:55,textAlign:"center"}} value={r.reading||""} onChange={e=>sf(c.k,"reading",e.target.value)} placeholder={c.u}/>}
              <BtnGrp value={r.pf||""} onChange={v=>sf(c.k,"pf",v)} opts={[{v:"P",l:"Pass",c:"#22c55e"},{v:"F",l:"Fail",c:"#ef4444"},{v:"NA",l:"N/A",c:"#64748b"}]}/>
              <CK checked={r.fu||false} onChange={v=>sf(c.k,"fu",v)} label="F/U" small/>
            </div>
          );
        })}
      </Sec>

      {/* ── FOLLOW-UP ── */}
      <Sec title="Follow-up">
        <CK checked={fi.followupNeeded==="yes"} onChange={v=>uf("followupNeeded",v?"yes":"no")} label="Follow-up needed"/>
        {fi.followupNeeded==="yes" && <textarea style={{...S.ta,marginTop:6}} value={fi.followupNotes||""} onChange={e=>uf("followupNotes",e.target.value)} rows={2} placeholder="What needs follow-up…"/>}
      </Sec>

      {/* ── SIGN-OFF ── */}
      <Sec title="Final Sign-off">
        <CK checked={p.finalPassed} onChange={v=>u({finalPassed:v})} label="✅ Final Inspection Passed"/>
        <div style={{marginTop:6}}><CK checked={p.customerSignoff} onChange={v=>u({customerSignoff:v})} label="✅ Customer Signature Collected"/></div>
        <SigPad label="Installer / Inspector Signature" value={fi.inspectorSig||""} onChange={v=>uf("inspectorSig",v)}/>
        <SigPad label="Customer Signature — Work Completion" value={fi.customerSig||""} onChange={v=>uf("customerSig",v)}/>
      </Sec>
    </div>
  );
}

function QAQCTab({p,u}) {
  const q = p.qaqc || {};
  const uq = (k,v) => u({qaqc:{...q,[k]:v}});
  const fi = q.fi || {};
  const ufi = (k,v) => uq("fi",{...fi,[k]:v});
  const sr = (cat,idx,f,v) => { const key=`${cat}-${idx}`; uq("results",{...(q.results||{}),[key]:{...(q.results?.[key]||{}),[f]:v}}); };

  const PFRow = ({item}) => {
    const d = fi[item.k] || {};
    const ud = (f,v) => ufi(item.k,{...d,[f]:v});
    return (
      <div style={{borderBottom:"1px solid rgba(255,255,255,.06)",padding:"8px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <span style={{flex:1,fontSize:11,minWidth:120,...(item.sub?{paddingLeft:16}:{fontWeight:600})}}>{item.l}</span>
          {item.yn && <BtnGrp value={d.yn||""} onChange={v=>ud("yn",v)} opts={[{v:"Y",l:"Yes",c:"#22c55e"},{v:"N",l:"No",c:"#ef4444"},{v:"NA",l:"N/A",c:"#64748b"}]}/>}
          {item.r && <input style={{...S.inp,width:70,fontSize:11}} value={d.reading||""} onChange={e=>ud("reading",e.target.value)} placeholder={item.u||""}/>}
          <BtnGrp value={d.pf||""} onChange={v=>ud("pf",v)} opts={[{v:"P",l:"P",c:"#22c55e"},{v:"F",l:"F",c:"#ef4444"},{v:"NA",l:"N/A",c:"#64748b"}]}/>
          <BtnGrp value={d.fu||""} onChange={v=>ud("fu",v)} opts={[{v:"Y",l:"F/U",c:"#f59e0b"},{v:"N",l:"No",c:"#64748b"},{v:"NA",l:"N/A",c:"#475569"}]}/>
        </div>
      </div>
    );
  };

  const getFIhtml = () => {
    let body = `<div class="sec"><h3>Final Inspection Info</h3>
      <div class="row"><span class="lbl">Homeowner</span><span class="val">${p.customerName||"—"}</span></div>
      <div class="row"><span class="lbl">Address</span><span class="val">${p.address||"—"}</span></div>
      <div class="row"><span class="lbl">Date</span><span class="val">${fi.date||"—"}</span></div>
      <div class="row"><span class="lbl">Installation Contractor</span><span class="val">${fi.contractor||"Assured Energy Solutions"}</span></div></div>`;
    body += `<div class="sec"><h3>Health &amp; Safety</h3>`;
    FI_SAFETY.forEach(item => {
      const d = fi[item.k]||{};
      const pfCls = d.pf==="P"?"pass":d.pf==="F"?"fail":"na";
      body += `<div class="row"><span class="lbl">${item.sub?"&nbsp;&nbsp;&nbsp;&nbsp;":""}${item.l}${d.reading?" ("+d.reading+" "+(item.u||"")+")":""}${item.yn?" — "+(d.yn||"—"):""}</span><span class="${pfCls}">${d.pf||"—"}</span><span style="font-size:10px;color:#999;margin-left:8px">F/U: ${d.fu||"—"}</span></div>`;
    });
    body += `<div class="row"><span class="lbl">Smoke detectors installed</span><span class="val">${fi.smokeQty||"—"}</span></div>`;
    body += `<div class="row"><span class="lbl">CO detectors installed</span><span class="val">${fi.coQty||"—"}</span></div>`;
    body += `<div class="row"><span class="lbl">Required ventilation (ASHRAE 62.2)</span><span class="val">${fi.ventCFM||"—"} CFM</span></div>`;
    body += `<div class="row"><span class="lbl">New exhaust fan installed</span><span class="val">${fi.newFan||"—"}</span></div>`;
    body += `<div class="row"><span class="lbl">All H&amp;S issues addressed</span><span class="${fi.hsAddressed==="Y"?"pass":"fail"}">${fi.hsAddressed||"—"}</span></div>`;
    if(fi.hsWhyNot) body += `<div class="row"><span class="lbl">If no, why not</span><span class="val">${fi.hsWhyNot}</span></div>`;
    body += `</div>`;
    body += `<div class="sec"><h3>Insulation</h3>`;
    FI_INSUL.forEach(ins => {
      const d = fi[ins.k]||{};
      body += `<div class="row"><span class="lbl"><b>${ins.l}</b> — Pre: R-${d.preR||"?"} → Post: R-${d.postR||"?"} — Insulated: ${d.done||"—"}</span></div>`;
    });
    body += `</div>`;
    body += `<div class="sec"><h3>Combustion Appliances (not including oven/stove) — Space Heating &amp; DHW</h3>`;
    [1,2,3].forEach(n => {
      const d = fi[`equip${n}`]||{};
      if(d.type) body += `<div class="row"><span class="lbl">${n}. ${d.type} — ${d.vent||""} — Replaced: ${d.replaced||"—"} — F/U: ${d.fu||"—"}</span></div>`;
    });
    body += `</div>`;
    body += `<div class="sec"><h3>Blower Door</h3><div class="row"><span class="lbl">Pre CFM50</span><span class="val">${p.preCFM50||fi.preCFM50||"—"}</span></div><div class="row"><span class="lbl">Post CFM50</span><span class="val">${p.postCFM50||fi.postCFM50||"—"}</span></div></div>`;
    body += `<div class="sec"><h3>Duct Sealing – Duct Blaster</h3><div class="row"><span class="lbl">Pre CFM25</span><span class="val">${fi.preCFM25||"—"}</span></div><div class="row"><span class="lbl">Post CFM25</span><span class="val">${fi.postCFM25||"—"}</span></div></div>`;
    body += `<div class="sec"><h3>Direct Installs</h3><div class="row"><span class="lbl">New thermostat installed</span><span class="val">${fi.thermostat||"—"}</span></div></div>`;
    if(fi.followUp) body += `<div class="sec"><h3>Follow-up Needed</h3><p>${fi.followUp}</p></div>`;
    body += `<div class="sec"><h3>Contractor Checklist</h3>`;
    FI_CONTRACTOR_CK.forEach(ck => { body += `<div class="row"><span class="lbl">${ck}</span><span class="${fi.ck?.[ck]?"pass":"na"}">${fi.ck?.[ck]?"☑":"☐"}</span></div>`; });
    body += `</div>`;
    return formPrintHTML("Home Energy Savings – Retrofits Final Inspection Form", p, body, fi.inspectorSig);
  };

  return (
    <div>
      {/* ── FINAL INSPECTION FORM ── */}
      <Sec title="📋 Home Energy Savings – Retrofits Final Inspection Form">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <p style={{fontSize:11,color:"#94a3b8",margin:0}}>Appendix F</p>
          <PrintBtn onClick={()=>savePrint(getFIhtml())}/>
        </div>
      </Sec>

      <Sec title="Inspection Info">
        <Gr>
          <F label="Homeowner Name" computed={p.customerName||"—"}/>
          <F label="Home Address" computed={p.address||"—"}/>
        </Gr>
        <Gr>
          <F label="Date of Final Inspection" value={fi.date||""} onChange={v=>ufi("date",v)} type="date"/>
          <F label="Installation Contractor" value={fi.contractor||"Assured Energy Solutions"} onChange={v=>ufi("contractor",v)}/>
        </Gr>
        <SigPad label="Customer Signature" value={fi.custSig||""} onChange={v=>ufi("custSig",v)}/>
      </Sec>

      {/* ── INSTALLATION CONTRACTOR CHECKLIST ── */}
      <Sec title="Installation Contractor Checklist">
        <p style={{fontSize:10,color:"#94a3b8",margin:0}}>Complete all sections below</p>
      </Sec>

      {/* ── HEALTH & SAFETY ── */}
      <Sec title="Health & Safety">
        <div style={{display:"flex",gap:16,fontSize:9,color:"#64748b",marginBottom:4,justifyContent:"flex-end"}}>
          <span>Pass/Fail</span><span>Follow-up?</span>
        </div>
        {FI_SAFETY.map(item => <PFRow key={item.k} item={item}/>)}

        <div style={{marginTop:10,borderTop:"1px solid rgba(255,255,255,.06)",paddingTop:10}}>
          <Gr>
            <F label="# Smoke Detectors Installed" value={fi.smokeQty||""} onChange={v=>ufi("smokeQty",v)} num/>
            <F label="# CO Detectors Installed" value={fi.coQty||""} onChange={v=>ufi("coQty",v)} num/>
          </Gr>
          <Gr>
            <F label="Required Ventilation Rate (ASHRAE 62.2)" value={fi.ventCFM||""} onChange={v=>ufi("ventCFM",v)} num suffix="CFM"/>
            <Sel label="New Exhaust Fan Installed?" value={fi.newFan||""} onChange={v=>ufi("newFan",v)} opts={["Yes","No"]}/>
          </Gr>
          <div style={{marginTop:8}}>
            <Sel label="Were all H&S issues addressed at home?" value={fi.hsAddressed||""} onChange={v=>ufi("hsAddressed",v)} opts={["Yes","No"]}/>
            {fi.hsAddressed==="No" && <div style={{marginTop:6}}><label style={S.fl}>If no, why not:</label><textarea style={S.ta} value={fi.hsWhyNot||""} onChange={e=>ufi("hsWhyNot",e.target.value)} rows={2}/></div>}
          </div>
        </div>
      </Sec>

      {/* ── INSULATION ── */}
      <Sec title="Insulation">
        {FI_INSUL.map(ins => {
          const d = fi[ins.k]||{};
          const ud = (f,v) => ufi(ins.k,{...d,[f]:v});
          return (
            <div key={ins.k} style={{borderBottom:"1px solid rgba(255,255,255,.06)",padding:"8px 0"}}>
              <div style={{fontSize:12,fontWeight:600,color:"#e2e8f0",marginBottom:4}}>{ins.l}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                <F label="Pre R-value" value={d.preR||""} onChange={v=>ud("preR",v)} num/>
                <F label="Post R-value" value={d.postR||""} onChange={v=>ud("postR",v)} num/>
                <Sel label={ins.q} value={d.done||""} onChange={v=>ud("done",v)} opts={["Yes","No"]}/>
              </div>
            </div>
          );
        })}
      </Sec>

      {/* ── SPACE HEATING & DHW ── */}
      <Sec title="Combustion Appliances (not including oven/stove) — Space Heating and DHW">
        {[1,2,3].map(n => {
          const d = fi[`equip${n}`]||{};
          const ud = (f,v) => ufi(`equip${n}`,{...d,[f]:v});
          return (
            <div key={n} style={{borderBottom:"1px solid rgba(255,255,255,.06)",padding:"8px 0"}}>
              <div style={{fontSize:11,fontWeight:600,color:"#94a3b8",marginBottom:4}}>Equipment {n}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                <F label="Equipment Type" value={d.type||""} onChange={v=>ud("type",v)}/>
                <Sel label="Vent Type" value={d.vent||""} onChange={v=>ud("vent",v)} opts={["Natural Draft","Sealed"]}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:4}}>
                <Sel label="Replaced?" value={d.replaced||""} onChange={v=>ud("replaced",v)} opts={["Yes","No"]}/>
                <Sel label="Follow-up needed?" value={d.fu||""} onChange={v=>ud("fu",v)} opts={["Yes","No"]}/>
              </div>
            </div>
          );
        })}
      </Sec>

      {/* ── BLOWER DOOR ── */}
      <Sec title="Blower Door">
        <Gr>
          <F label="Pre CFM50" computed={p.preCFM50||"—"}/>
          <F label="Post CFM50" computed={p.postCFM50||"—"}/>
        </Gr>
      </Sec>

      {/* ── DUCT SEALING ── */}
      <Sec title="Duct Sealing — Duct Blaster">
        <Gr>
          <F label="Pre CFM25" value={fi.preCFM25||""} onChange={v=>ufi("preCFM25",v)} num/>
          <F label="Post CFM25" value={fi.postCFM25||""} onChange={v=>ufi("postCFM25",v)} num/>
        </Gr>
      </Sec>

      {/* ── DIRECT INSTALLS ── */}
      <Sec title="Direct Installs">
        <Sel label="Was a new thermostat installed?" value={fi.thermostat||""} onChange={v=>ufi("thermostat",v)} opts={["Yes","No"]}/>
      </Sec>

      {/* ── FOLLOW-UP ── */}
      <Sec title="Follow-up Needed">
        <CK checked={fi.followUpNA} onChange={v=>ufi("followUpNA",v)} label="N/A"/>
        {!fi.followUpNA && <textarea style={{...S.ta,marginTop:6}} value={fi.followUp||""} onChange={e=>ufi("followUp",e.target.value)} rows={3} placeholder="Please list any follow-up needed for this customer's home…"/>}
      </Sec>

      {/* ── CONTRACTOR CHECKLIST ── */}
      <Sec title="Contractor Checklist">
        <p style={{fontSize:10,color:"#64748b",marginBottom:6,fontStyle:"italic"}}>To be completed by the contractor:</p>
        {FI_CONTRACTOR_CK.map(ck => <CK key={ck} checked={fi.ck?.[ck]} onChange={v=>ufi("ck",{...(fi.ck||{}),[ck]:v})} label={ck}/>)}
      </Sec>

      {/* ── INSPECTOR SIGNATURE ── */}
      <Sec title="Inspector Sign-off">
        <SigPad label="Inspector Signature" value={fi.inspectorSig||""} onChange={v=>ufi("inspectorSig",v)}/>
      </Sec>

      {/* ── QAQC OBSERVATION FORM (Appendix G) ── */}
      <Sec title="🔎 QAQC Observation Form">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <p style={{fontSize:11,color:"#94a3b8",margin:0}}>Per Appendix G — post-installation observation</p>
          <PrintBtn onClick={()=>{
            let body = `<div class="sec"><h3>Info</h3><div class="row"><span class="lbl">Date</span><span class="val">${q.date||"—"}</span></div><div class="row"><span class="lbl">Inspector</span><span class="val">${q.inspector||"—"}</span></div></div>`;
            Object.entries(QAQC_SECTIONS).forEach(([cat,items]) => {
              const rows = items.map((item,i) => {
                const r = q.results?.[`${cat}-${i}`]||{};
                const cls = r.v==="Y"?"pass":r.v==="N"?"fail":"na";
                return `<div class="row"><span class="lbl">${i+1}. ${item}</span><span class="${cls}">${r.v||"—"}</span></div>`;
              }).join("");
              body += `<div class="sec"><h3>${cat}</h3>${rows}</div>`;
            });
            body += `<div class="sec"><h3>Result</h3><div class="row"><span class="lbl">Overall</span><span class="${q.passed===true?"pass":"fail"}">${q.passed===true?"PASS":q.passed===false?"FAIL":"—"}</span></div>${q.notes?`<p style="margin-top:6px;color:#666">${q.notes}</p>`:""}</div>`;
            savePrint(formPrintHTML("QAQC Observation Form", p, body, q.inspectorSig));
          }}/>
        </div>
      </Sec>
      <Sec title="Observation Info">
        <Gr><F label="Date" value={q.date||""} onChange={v=>uq("date",v)} type="date"/><F label="Inspector" value={q.inspector||""} onChange={v=>uq("inspector",v)}/></Gr>
        <div style={{marginTop:6}}><CK checked={q.scheduled} onChange={v=>uq("scheduled",v)} label="QAQC Scheduled"/></div>
      </Sec>
      {Object.entries(QAQC_SECTIONS).map(([cat,items]) => (
        <Sec key={cat} title={cat}>
          {items.map((item,i) => {
            const r = q.results?.[`${cat}-${i}`] || {};
            return (
              <div key={i} style={S.qqR}>
                <span style={{flex:1,fontSize:11,minWidth:100}}>{i+1}. {item}</span>
                <BtnGrp value={r.v||""} onChange={v=>sr(cat,i,"v",v)} opts={[{v:"Y",l:"Y",c:"#22c55e"},{v:"N",l:"N",c:"#ef4444"},{v:"NA",l:"N/A",c:"#64748b"}]}/>
                <input style={{...S.inp,width:90}} value={r.c||""} onChange={e=>sr(cat,i,"c",e.target.value)} placeholder="Comment"/>
              </div>
            );
          })}
        </Sec>
      ))}
      <Sec title="Overall Result">
        <Sel label="Result" value={q.passed===true?"pass":q.passed===false?"fail":""} onChange={v=>uq("passed",v==="pass"?true:v==="fail"?false:null)} opts={["pass","fail"]}/>
        <textarea style={{...S.ta,marginTop:8}} value={q.notes||""} onChange={e=>uq("notes",e.target.value)} rows={3} placeholder="Overall notes…"/>
        <SigPad label="QAQC Inspector Signature" value={q.inspectorSig||""} onChange={v=>uq("inspectorSig",v)}/>
      </Sec>
    </div>
  );
}

function CloseoutTab({p,u,onLog}) {
  const docDone = DOCS.filter(d => p.docsChecklist?.[d]).length;

  const getCloseoutHTML = () => {
    const docRows = DOCS.map(d => `<div class="row"><span class="lbl">${d}</span><span class="${p.docsChecklist?.[d]?"pass":"na"}">${p.docsChecklist?.[d]?"✓":"—"}</span></div>`).join("");
    const body = `<div class="sec"><h3>Documents (${docDone}/${DOCS.length})</h3>${docRows}</div>
      <div class="sec"><h3>Payment</h3><div class="row"><span class="lbl">Invoice</span><span class="val">${p.invoiceAmt?"$"+p.invoiceAmt:"—"}</span></div><div class="row"><span class="lbl">Submitted</span><span class="${p.paymentSubmitted?"pass":"na"}">${p.paymentSubmitted?"Yes":"No"}</span></div></div>
      <div class="sec"><h3>Summary</h3><div class="grid">
        <div class="row"><span class="lbl">Stage</span><span class="val">${STAGES[p.currentStage].label}</span></div>
        <div class="row"><span class="lbl">Measures</span><span class="val">${p.measures.length} EE + ${p.healthSafety.length} H&S</span></div>
        <div class="row"><span class="lbl">Blower Door</span><span class="val">${p.preCFM50&&p.postCFM50?p.preCFM50+"→"+p.postCFM50:"—"}</span></div>
        <div class="row"><span class="lbl">Scope</span><span class="${p.scopeApproved?"pass":"na"}">${p.scopeApproved?"Approved":"Pending"}</span></div>
        <div class="row"><span class="lbl">Final Insp</span><span class="${p.finalPassed?"pass":"na"}">${p.finalPassed?"Passed":"—"}</span></div>
      </div></div>`;
    return formPrintHTML("Project Closeout", p, body, p.custAuthSig);
  };

  return (
    <div>
      <Sec title={<span>Documents {docDone}/{DOCS.length}</span>}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={S.prog}><div style={{...S.progF,width:`${(docDone/DOCS.length)*100}%`}}/></div>
          <PrintBtn onClick={()=>savePrint(getCloseoutHTML())}/>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {DOCS.map(d => <CK key={d} checked={p.docsChecklist?.[d]} onChange={()=>u({docsChecklist:{...p.docsChecklist,[d]:!p.docsChecklist?.[d]}})} label={d} color={p.docsChecklist?.[d]?"#22c55e":null} strike={p.docsChecklist?.[d]}/>)}
        </div>
      </Sec>
      <Sec title="Install Notes"><textarea style={S.ta} value={p.installNotes} onChange={e=>u({installNotes:e.target.value})} rows={3} placeholder="Crew notes…"/></Sec>
      <Sec title="Payment">
        <Gr><F label="Invoice $" value={p.invoiceAmt} onChange={v=>u({invoiceAmt:v})}/><F label="Submit Date" value={p.paymentDate} onChange={v=>u({paymentDate:v})} type="date"/></Gr>
        <div style={{marginTop:8}}><CK checked={p.paymentSubmitted} onChange={v=>{u({paymentSubmitted:v});if(v)onLog("Payment submitted to RISE");}} label="Submitted to RISE"/></div>
      </Sec>
      <Sec title="Summary">
        <div style={S.sumG}>
          <SI l="Stage" v={STAGES[p.currentStage].label}/>
          <SI l="Measures" v={`${p.measures.length} EE + ${p.healthSafety.length} H&S`}/>
          <SI l="Blower Door" v={p.preCFM50&&p.postCFM50?`${p.preCFM50}→${p.postCFM50}`:"—"}/>
          <SI l="Scope" v={p.scopeApproved?"✓ Approved":"Pending"} c={p.scopeApproved?"#22c55e":"#94a3b8"}/>
          <SI l="Inspection" v={p.finalPassed?"✓ Passed":"—"} c={p.finalPassed?"#22c55e":"#94a3b8"}/>
          <SI l="Sign-off" v={p.customerSignoff?"✓":"—"} c={p.customerSignoff?"#22c55e":"#94a3b8"}/>
          <SI l="Photos" v={`${Object.keys(p.photos||{}).filter(k=>hasPhoto(p.photos,k)).length} slots`}/>
          <SI l="Payment" v={p.paymentSubmitted?`$${p.invoiceAmt}`:"Pending"} c={p.paymentSubmitted?"#22c55e":"#94a3b8"}/>
        </div>
      </Sec>
    </div>
  );
}

function LogTab({p,onLog}) {
  const [n, setN] = useState("");
  return (
    <div>
      <Sec title="Add Note">
        <div style={{display:"flex",gap:6}}>
          <input style={{...S.inp,flex:1}} value={n} onChange={e=>setN(e.target.value)} placeholder="What happened?"/>
          <button style={{...S.btn,padding:"8px 14px",opacity:n?1:.4}} disabled={!n} onClick={()=>{onLog(n);setN("");}}>Add</button>
        </div>
      </Sec>
      <Sec title={`History (${p.activityLog.length})`}>
        {p.activityLog.length === 0 ? <p style={{color:"#64748b",fontSize:12}}>No activity yet.</p> : (
          p.activityLog.map((a,i) => (
            <div key={i} style={S.logR}>
              <span style={S.logT}>{new Date(a.ts).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</span>
              <span style={{fontSize:12,flex:1}}>{a.txt}</span>
              {a.by && <span style={S.logB}>{a.by}{a.role?` (${a.role})`:""}</span>}
            </div>
          ))
        )}
      </Sec>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// USER MANAGEMENT (Admin)
// ═══════════════════════════════════════════════════════════════
function UserMgmt({users, onSave, onDelete, onClose}) {
  const [edit, setEdit] = useState(null); // user object being edited/created
  const [confirmDel, setConfirmDel] = useState(null);

  const startNew = () => setEdit({id:uid(), name:"", username:"", pin:"", role:"installer", isNew:true});
  const startEdit = (u) => setEdit({...u, isNew:false});
  const doSave = () => {
    if (!edit.name.trim() || !edit.username.trim() || !edit.pin.trim()) return;
    // Check for duplicate username
    const dup = users.find(u => u.username.toLowerCase() === edit.username.trim().toLowerCase() && u.id !== edit.id);
    if (dup) { alert("Username already taken"); return; }
    const clean = {id:edit.id, name:edit.name.trim(), username:edit.username.trim().toLowerCase(), pin:edit.pin.trim(), role:edit.role};
    if (edit.isNew) onSave([...users, clean]);
    else onSave(users.map(u => u.id === edit.id ? clean : u));
    setEdit(null);
  };
  const doDelete = (id) => { if(onDelete) onDelete(id); setConfirmDel(null); };

  const row = {display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderBottom:"1px solid rgba(255,255,255,.06)"};
  const badge = (r) => {const m=ROLES.find(x=>x.key===r); return <span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:"rgba(99,102,241,.15)",color:"#a5b4fc"}}>{m?.icon} {m?.label||r}</span>;};

  return (
    <Sec title={<span>👥 User Management <button type="button" onClick={onClose} style={{float:"right",background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:14}}>✕</button></span>}>
      {!edit ? <>
        {users.map(u => (
          <div key={u.id} style={row}>
            {confirmDel === u.id ? (
              <div style={{flex:1,display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:12,color:"#ef4444"}}>Delete {u.name}?</span>
                <button type="button" onClick={()=>doDelete(u.id)} style={{padding:"3px 8px",borderRadius:4,border:"1px solid rgba(239,68,68,.4)",background:"rgba(239,68,68,.1)",color:"#ef4444",fontSize:10,fontWeight:700,cursor:"pointer"}}>Yes</button>
                <button type="button" onClick={()=>setConfirmDel(null)} style={{padding:"3px 8px",borderRadius:4,border:"1px solid rgba(255,255,255,.1)",background:"transparent",color:"#94a3b8",fontSize:10,cursor:"pointer"}}>No</button>
              </div>
            ) : <>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,color:"#e2e8f0",fontWeight:600}}>{u.name}</div>
                <div style={{fontSize:10,color:"#64748b",fontFamily:"'JetBrains Mono',monospace"}}>{u.username} · PIN: {u.pin}</div>
              </div>
              {badge(u.role)}
              <button type="button" onClick={()=>startEdit(u)} style={{background:"none",border:"none",color:"#818cf8",cursor:"pointer",fontSize:12}}>✏️</button>
              <button type="button" onClick={()=>setConfirmDel(u.id)} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:12}}>🗑️</button>
            </>}
          </div>
        ))}
        <button type="button" onClick={startNew} style={{...S.btn,width:"100%",marginTop:8,padding:"10px",fontSize:13}}>+ Add User</button>
      </> : <>
        <div style={{marginBottom:8}}>
          <label style={S.fl}>Name</label>
          <input style={S.inp} value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})} placeholder="Full name"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <div><label style={S.fl}>Username</label><input style={S.inp} value={edit.username} onChange={e=>setEdit({...edit,username:e.target.value})} placeholder="username" autoCapitalize="none"/></div>
          <div><label style={S.fl}>PIN</label><input style={S.inp} value={edit.pin} onChange={e=>setEdit({...edit,pin:e.target.value})} placeholder="1234" inputMode="numeric" maxLength={8}/></div>
        </div>
        <div style={{marginBottom:12}}>
          <label style={S.fl}>Role</label>
          <select style={{...S.inp,cursor:"pointer",appearance:"auto",WebkitAppearance:"menulist"}} value={edit.role} onChange={e=>setEdit({...edit,role:e.target.value})}>
            {ROLES.map(r => <option key={r.key} value={r.key}>{r.icon} {r.label}</option>)}
          </select>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button type="button" onClick={doSave} style={{...S.btn,flex:1,padding:"10px"}}>{edit.isNew?"Add User":"Save Changes"}</button>
          <button type="button" onClick={()=>setEdit(null)} style={{...S.ghost,flex:1,padding:"10px"}}>Cancel</button>
        </div>
      </>}
    </Sec>
  );
}

function Hdr({role,user,onSw,onBack,title,sub,badge,actions}) {
  return (
    <header style={S.hdr}>
      <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
        {onBack && <button style={{...S.back,fontSize:20}} onClick={onBack}>←</button>}
        <div style={{minWidth:0,flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <h1 style={S.hT}>{title}</h1>{badge}
          </div>
          {sub && <p style={S.hS}>{sub}</p>}
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
        {actions}
        <button style={S.rChip} onClick={onSw} title="Sign out">{role?.icon} {user} <span style={{fontSize:10,marginLeft:4,opacity:.6}}>↪</span></button>
      </div>
    </header>
  );
}

function Sec({title,children,danger}) {
  return <div style={{...S.sec,...(danger?{borderColor:"rgba(239,68,68,.3)"}:{})}}><h3 style={{...S.secT,...(danger?{color:"#ef4444"}:{})}}>{title}</h3>{children}</div>;
}
function Gr({children}) { return <div style={S.gr}>{children}</div>; }
function F({label,value,onChange,type="text",placeholder,num,computed,suffix}) {
  return <div style={{display:"flex",flexDirection:"column"}}>
    <label style={S.fl}>{label}</label>
    {computed !== undefined ? (
      <div style={{...S.inp,marginTop:"auto",background:"rgba(99,102,241,.08)",color:"#a5b4fc"}}>{computed}{suffix && <span style={{fontSize:10,color:"#64748b",marginLeft:4}}>{suffix}</span>}</div>
    ) : (
      <input style={{...S.inp,marginTop:"auto"}} type={type} inputMode={num?"decimal":undefined} value={value||""} onChange={e=>{
        if(num){const v=e.target.value;if(v===""||/^-?\d*\.?\d*$/.test(v))onChange(v);}
        else onChange(e.target.value);
      }} placeholder={placeholder}/>
    )}
  </div>;
}
function Sel({label,value,onChange,opts}) {
  return (
    <div style={{display:"flex",flexDirection:"column"}}>
      <label style={S.fl}>{label}</label>
      <select value={value||""} onChange={e=>onChange(e.target.value)} style={{...S.inp,cursor:"pointer",marginTop:"auto",appearance:"auto",WebkitAppearance:"menulist",color:value?"#e2e8f0":"#64748b"}}>
        <option value="" style={{background:"#1e293b",color:"#64748b"}}>— Select —</option>
        {opts.map(o => <option key={o} value={o} style={{background:"#1e293b",color:"#e2e8f0"}}>{o}</option>)}
      </select>
    </div>
  );
}
function CK({checked,onChange,label,color,strike,small}) { return <label style={{...S.ck,fontSize:small?10:12,...(color?{color}:{}),cursor:"pointer",...(strike?{textDecoration:"line-through"}:{})}}><input type="checkbox" checked={!!checked} onChange={e=>onChange(e.target.checked)} style={{marginRight:6,accentColor:"#6366f1",width:small?14:16,height:small?14:16,flexShrink:0}}/><span style={{lineHeight:1.3}}>{label}</span></label>; }
function BtnGrp({value,onChange,opts}) { return <div style={{display:"flex",gap:2}}>{opts.map(o=><button key={o.v} type="button" onClick={()=>onChange(value===o.v?"":o.v)} style={{padding:"5px 8px",borderRadius:5,border:value===o.v?`2px solid ${o.c}`:"1px solid rgba(255,255,255,.1)",background:value===o.v?`${o.c}22`:"rgba(255,255,255,.03)",color:value===o.v?o.c:"#64748b",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",minWidth:36,minHeight:32}}>{o.l}</button>)}</div>; }

function SigPad({value, onChange, label}) {
  const [signing, setSigning] = useState(false);
  const canRef = useRef(null);
  const drawing = useRef(false);
  const lastPt = useRef(null);

  const startDraw = () => {
    const can = canRef.current; if (!can) return;
    const ctx = can.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0,0,can.width,can.height);
    ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
  };

  const getPos = (e) => {
    const r = canRef.current.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  };

  const down = (e) => { e.preventDefault(); drawing.current = true; lastPt.current = getPos(e); };
  const move = (e) => {
    if (!drawing.current || !canRef.current) return;
    e.preventDefault();
    const ctx = canRef.current.getContext("2d");
    const pt = getPos(e);
    ctx.beginPath(); ctx.moveTo(lastPt.current.x, lastPt.current.y);
    ctx.lineTo(pt.x, pt.y); ctx.stroke();
    lastPt.current = pt;
  };
  const up = () => { drawing.current = false; lastPt.current = null; };

  const save = () => {
    if (!canRef.current) return;
    onChange(canRef.current.toDataURL("image/png"));
    setSigning(false);
  };
  const clear = () => { onChange(""); };

  if (signing) {
    return (
      <div style={S.camOv}>
        <div style={S.camH}>
          <button style={{...S.back,fontSize:18}} onClick={()=>setSigning(false)}>✕ Cancel</button>
          <div style={{flex:1,textAlign:"center",fontWeight:600,fontSize:14}}>{label || "Sign"}</div>
          <button style={{...S.btn,padding:"6px 14px",minHeight:40}} onClick={save}>Done</button>
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16,background:"#0b0e18"}}>
          <p style={{fontSize:12,color:"#94a3b8",marginBottom:8}}>Sign below with finger or stylus</p>
          <canvas ref={el=>{canRef.current=el;if(el){el.width=Math.min(600,window.innerWidth-40);el.height=180;startDraw();}}}
            style={{borderRadius:8,border:"2px solid #334155",touchAction:"none",cursor:"crosshair",background:"#fff"}}
            onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up}
            onTouchStart={down} onTouchMove={move} onTouchEnd={up}/>
          <button style={{...S.ghost,marginTop:10,fontSize:12}} onClick={()=>{if(canRef.current){const ctx=canRef.current.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,canRef.current.width,canRef.current.height);}}}>Clear Pad</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{marginTop:8}}>
      <label style={S.fl}>{label || "Signature"}</label>
      {value ? (
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{background:"#fff",borderRadius:6,padding:4,border:"1px solid rgba(255,255,255,.1)"}}>
            <img src={value} style={{height:50,objectFit:"contain"}} alt="sig"/>
          </div>
          <button style={{...S.ghost,fontSize:10,padding:"4px 10px",minHeight:36}} onClick={clear}>Clear</button>
          <button style={{...S.ghost,fontSize:10,padding:"4px 10px",minHeight:36}} onClick={()=>setSigning(true)}>Re-sign</button>
        </div>
      ) : (
        <button style={{...S.btn,padding:"8px 16px",minHeight:44,WebkitTapHighlightColor:"transparent"}} onClick={()=>setSigning(true)}>✍️ Tap to Sign</button>
      )}
    </div>
  );
}

function PrintBtn({onClick,label}) {
  return <button style={{...S.ghost,fontSize:11,padding:"6px 10px",display:"flex",alignItems:"center",gap:3}} onClick={onClick}>📄 {label||"Save / Print"}</button>;
}
function SI({l,v,c}) { return <div style={S.si}><span style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:".04em"}}>{l}</span><span style={{fontSize:13,fontWeight:600,color:c||"#e2e8f0",marginTop:2}}>{v}</span></div>; }

// ═══════════════════════════════════════════════════════════════
// STYLES - responsive for iPhone/iPad/Laptop
// ═══════════════════════════════════════════════════════════════
const S = {
  app: { fontFamily:"'DM Sans',sans-serif", background:"#0b0e18", minHeight:"100vh", color:"#e2e8f0", paddingBottom:60, maxWidth:1200, margin:"0 auto" },
  center: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", background:"#0b0e18" },
  spin: { width:24, height:24, border:"3px solid #1e293b", borderTopColor:"#6366f1", borderRadius:"50%", animation:"spin .7s linear infinite" },

  // Role picker
  rpWrap: { maxWidth:440, margin:"0 auto", padding:"48px 20px" },
  logoBox: { width:52, height:52, borderRadius:14, background:"linear-gradient(135deg,#6366f1,#a855f7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, margin:"0 auto" },
  rCard: { display:"flex", alignItems:"center", gap:12, padding:"14px 16px", background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:10, cursor:"pointer", color:"#e2e8f0", fontFamily:"'DM Sans',sans-serif", width:"100%" },

  // Header
  hdr: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,.06)", background:"#0b0e18", flexWrap:"wrap", gap:6, position:"sticky", top:0, zIndex:100 },
  hT: { fontSize:16, fontWeight:700, margin:0, color:"#f1f5f9" },
  hS: { fontSize:11, color:"#64748b", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  back: { background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:18, fontFamily:"'DM Sans',sans-serif", padding:"4px 6px", minWidth:44, minHeight:44, display:"flex", alignItems:"center", justifyContent:"center" },
  rChip: { background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, padding:"6px 12px", color:"#e2e8f0", fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", minHeight:36 },
  bdg: { padding:"3px 10px", borderRadius:6, fontSize:11, fontWeight:600, whiteSpace:"nowrap", color:"#fff" },

  // Buttons
  btn: { background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", border:"none", padding:"8px 16px", borderRadius:8, fontWeight:600, cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif", minHeight:36 },
  ghost: { background:"none", border:"1px solid rgba(255,255,255,.12)", color:"#94a3b8", padding:"8px 14px", borderRadius:8, cursor:"pointer", fontSize:12, fontFamily:"'DM Sans',sans-serif", minHeight:36 },

  // Dashboard
  readyBan: { display:"flex", alignItems:"center", gap:8, padding:"10px 16px", background:"linear-gradient(135deg,rgba(245,158,11,.1),rgba(234,179,8,.05))", borderBottom:"1px solid rgba(245,158,11,.2)", cursor:"pointer" },
  alertBar: { padding:"8px 16px", display:"flex", gap:6, flexWrap:"wrap", borderBottom:"1px solid rgba(255,255,255,.04)", background:"rgba(255,255,255,.01)" },
  alertBox: { display:"flex", alignItems:"flex-start", gap:8, padding:12, background:"rgba(245,158,11,.08)", border:"1px solid rgba(245,158,11,.2)", borderRadius:10, marginBottom:12 },
  pipe: { display:"flex", gap:4, padding:"8px 16px", overflowX:"auto", borderBottom:"1px solid rgba(255,255,255,.04)", WebkitOverflowScrolling:"touch" },
  chip: { display:"flex", alignItems:"center", gap:3, padding:"6px 10px", borderRadius:6, border:"1px solid", cursor:"pointer", fontSize:12, fontFamily:"'DM Sans',sans-serif", minHeight:32, whiteSpace:"nowrap" },
  chipN: { fontSize:10, fontWeight:700, fontFamily:"'JetBrains Mono',monospace" },
  sRow: { display:"flex", gap:6, padding:"8px 16px" },
  sInp: { flex:1, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", borderRadius:8, padding:"10px 12px", color:"#e2e8f0", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none" },
  list: { display:"flex", flexDirection:"column", gap:4, padding:"4px 16px" },
  card: { background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:10, padding:"12px 14px", cursor:"pointer", textAlign:"left", fontFamily:"'DM Sans',sans-serif", width:"100%", color:"#e2e8f0", minHeight:44 },
  cTop: { display:"flex", justifyContent:"space-between", alignItems:"center", gap:6 },
  cName: { fontWeight:600, fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  cMeta: { display:"flex", gap:8, marginTop:5, fontSize:10, color:"#64748b", fontFamily:"'JetBrains Mono',monospace", flexWrap:"wrap" },
  tBadge: { fontSize:9, padding:"2px 6px", borderRadius:4, background:"rgba(245,158,11,.15)", color:"#fbbf24", fontWeight:600 },
  empty: { textAlign:"center", padding:50 },

  // Stage bar
  stBar: { display:"flex", gap:3, padding:"8px 16px", overflowX:"auto", WebkitOverflowScrolling:"touch" },
  stStep: { display:"flex", flexDirection:"column", alignItems:"center", gap:2, padding:"4px 3px", borderRadius:5, flex:1, minWidth:36 },

  // Tabs
  tabR: { display:"flex", gap:0, padding:"0 16px", borderBottom:"1px solid rgba(255,255,255,.06)", overflowX:"auto", WebkitOverflowScrolling:"touch", position:"sticky", top:52, zIndex:99, background:"#0b0e18" },
  tabB: { padding:"10px 12px", background:"none", border:"none", borderBottom:"2px solid transparent", color:"#64748b", cursor:"pointer", fontSize:12, fontFamily:"'DM Sans',sans-serif", fontWeight:500, whiteSpace:"nowrap", minHeight:40 },
  tabA: { color:"#e2e8f0", borderBottomColor:"#6366f1" },
  cnt: { padding:"12px 16px" },

  // Sections
  sec: { background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)", borderRadius:10, padding:"14px 14px 12px", marginBottom:8 },
  secT: { fontSize:13, fontWeight:600, color:"#f1f5f9", margin:"0 0 10px", lineHeight:1.3 },

  // Form fields
  gr: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:8 },
  fl: { fontSize:10, fontWeight:500, color:"#94a3b8", marginBottom:3, display:"block", textTransform:"uppercase", letterSpacing:".04em" },
  inp: { width:"100%", background:"#1e293b", border:"1px solid rgba(255,255,255,.1)", borderRadius:6, padding:"8px 10px", color:"#e2e8f0", fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box", minHeight:38, WebkitAppearance:"none", colorScheme:"dark" },
  ta: { width:"100%", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)", borderRadius:6, padding:"8px 10px", color:"#e2e8f0", fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:"none", resize:"vertical", boxSizing:"border-box", minHeight:44 },
  ck: { fontSize:12, color:"#cbd5e1", cursor:"pointer", display:"flex", alignItems:"center", padding:"4px 0", minHeight:32, gap:0 },
  ckG: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:"0px 8px" },

  // Diagnostics
  calc: { marginTop:8, padding:"8px 10px", background:"rgba(255,255,255,.04)", borderRadius:8, fontSize:12, fontFamily:"'JetBrains Mono',monospace", display:"flex", flexWrap:"wrap", gap:4 },
  cazR: { display:"flex", alignItems:"center", gap:6, padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,.04)", flexWrap:"wrap" },
  qqR: { display:"flex", alignItems:"center", gap:6, padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,.04)", flexWrap:"wrap" },

  // Photos
  phRow: { display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,.04)" },
  cBtn: { width:40, height:40, borderRadius:8, border:"1px dashed rgba(99,102,241,.4)", background:"rgba(99,102,241,.08)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18 },
  uBtn: { width:40, height:40, borderRadius:8, border:"1px dashed rgba(255,255,255,.15)", background:"rgba(255,255,255,.04)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18 },
  thBtn: { width:44, height:44, borderRadius:8, border:"2px solid #22c55e", padding:0, cursor:"pointer", overflow:"hidden", background:"#000" },
  th: { width:"100%", height:"100%", objectFit:"cover" },
  camOv: { position:"fixed", top:0, left:0, right:0, bottom:0, background:"#000", zIndex:9999, display:"flex", flexDirection:"column", fontFamily:"'DM Sans',sans-serif", color:"#e2e8f0" },
  camH: { display:"flex", alignItems:"center", gap:8, padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,.1)", background:"rgba(0,0,0,.8)" },
  camB: { flex:1, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" },
  vid: { width:"100%", height:"100%", objectFit:"cover" },
  camF: { display:"flex", justifyContent:"center", padding:"20px 16px 36px", background:"rgba(0,0,0,.8)" },
  snapB: { width:68, height:68, borderRadius:"50%", border:"4px solid #fff", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:3 },
  snapI: { width:"100%", height:"100%", borderRadius:"50%", background:"#fff" },

  // Progress
  prog: { width:"100%", height:4, background:"rgba(255,255,255,.06)", borderRadius:2, overflow:"hidden" },
  progF: { height:"100%", background:"#22c55e", borderRadius:2, transition:"width .3s" },

  // Summary
  sumG: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:6 },
  si: { background:"rgba(255,255,255,.03)", borderRadius:8, padding:"8px 10px", border:"1px solid rgba(255,255,255,.06)", display:"flex", flexDirection:"column" },

  // Log
  logR: { display:"flex", gap:6, padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,.04)", alignItems:"baseline", flexWrap:"wrap" },
  logT: { fontSize:10, color:"#64748b", fontFamily:"'JetBrains Mono',monospace", minWidth:80 },
  logB: { fontSize:10, color:"#8b5cf6", fontStyle:"italic" },
};
