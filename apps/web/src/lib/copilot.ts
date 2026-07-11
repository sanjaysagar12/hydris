export interface CopilotAnswer {
  user: string;
  bot: string;
  cites: string[];
}

export const copilotAnswers: Record<string, CopilotAnswer> = {
  "off-track": {
    user: "Which suppliers are off-track and why?",
    bot: `Two suppliers are off-track this cycle:<br><br>
      <b>Delta River Textiles</b> (Dhaka) — downgraded from MRSL Level 2 to Level 1. BOD exceeded the permitted limit by 30 mg/L on the 04 Jul audit, and its ZDHC InCheck certification expires in 29 days.<br><br>
      <b>Ganga Blue Processing</b> (Kanpur) — flagged for Chromium (VI) above threshold on InCheck, open 11 days. Its discharge volume doesn't reconcile with reported withdrawal, which is also flagged as a possible data anomaly.`,
    cites: ["ZDHC ClearStream audit, 04 Jul 2026", "ZDHC InCheck, self-reported, 30 Jun 2026"],
  },
  upgrade: {
    user: "Which plants are ready for a filtration upgrade?",
    bot: `<b>Anchor Dye Works</b> (Tirupur) is the strongest candidate — Level 2 tier, 41% reuse rate, high basin scarcity risk (4.2), and no membrane filtration installed yet. Its profile closely matches <b>Song Ha Garment Co.</b>, which adopted membrane bioreactor filtration last year and moved from Level 2 to Level 3 with reuse rising from 34% to 57%.<br><br>
      Estimated impact if replicated: reuse rate +15–20pts, PWI Availability contribution roughly 2.3x current.`,
    cites: ["Higg FEM equipment field, Song Ha Garment Co.", "WQBA engine v2.1, comparable-facility model"],
  },
  cdp: {
    user: "What's blocking our CDP disclosure this year?",
    bot: `Portfolio-wide CDP readiness is 7 of 9 required questions. The two gaps:<br><br>
      <b>W1.2</b> (withdrawal by source) — missing source-type breakdown for 12 suppliers, mostly Level 1 tier facilities that self-report without metered data.<br>
      <b>W4.1</b> (facilities exposed to water risk) — basin risk data is complete, but 8 suppliers lack a documented risk-response plan on file.`,
    cites: ["CDP Water Security questionnaire, W1.2 / W4.1", "GRI 303 export, coverage check"],
  },
};

export const fallbackAnswer =
  "I can answer questions grounded in the current data pack — try one of the suggested questions above, or ask about a specific supplier, region, or standard (ZDHC, AWS, Higg, WRI Aqueduct).";
