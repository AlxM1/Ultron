import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.CONTENT_INTEL_DB_HOST || "raiser-postgres",
  database: "content_intel",
  user: process.env.CONTENT_INTEL_DB_USER || "postgres",
  password: process.env.CONTENT_INTEL_DB_PASSWORD || "",
  port: 5432,
  max: 3,
});

export const POSITIVE = ["love","amazing","great","awesome","excellent","brilliant","best","incredible","fantastic","thank","helpful","insightful","genius","powerful","groundbreaking","revolutionary","perfect","beautiful","outstanding","impressive","wonderful","superb"];
export const NEGATIVE = ["hate","terrible","worst","awful","garbage","trash","scam","useless","stupid","horrible","disappointed","overrated","waste","boring","misleading","annoying","pathetic","ridiculous","fake","broken","sucks","dumb"];

export function classifySentiment(text: string): "positive" | "negative" | "neutral" {
  const lower = text.toLowerCase();
  const posCount = POSITIVE.filter(w => lower.includes(w)).length;
  const negCount = NEGATIVE.filter(w => lower.includes(w)).length;
  if (posCount > negCount) return "positive";
  if (negCount > posCount) return "negative";
  return "neutral";
}

export const STOP_WORDS = new Set([
  "the","a","an","is","are","was","were","be","been","being","have","has","had","do","does","did",
  "will","would","could","should","may","might","shall","can","need","dare","ought","used","to",
  "of","in","for","on","with","at","by","from","up","about","into","over","after","beneath","under",
  "above","between","out","through","during","before","against","among","throughout","despite",
  "towards","upon","concerning","and","but","or","nor","not","so","yet","both","either","neither",
  "each","every","all","any","few","more","most","other","some","such","no","only","own","same",
  "than","too","very","just","because","as","until","while","although","though","if","when","where",
  "how","what","which","who","whom","this","that","these","those","i","me","my","myself","we","our",
  "ours","ourselves","you","your","yours","yourself","yourselves","he","him","his","himself","she",
  "her","hers","herself","it","its","itself","they","them","their","theirs","themselves","am","s",
  "t","d","ll","ve","re","m","don","didn","doesn","isn","aren","wasn","weren","won","wouldn",
  "couldn","shouldn","hasn","haven","hadn","let","said","say","says","like","get","got","go",
  "going","gone","come","came","make","made","know","knew","think","thought","take","took","see",
  "saw","want","look","use","find","give","tell","work","call","try","ask","seem","feel","leave",
  "put","mean","keep","begin","show","hear","play","run","move","live","believe","happen","write",
  "provide","sit","stand","lose","pay","meet","include","continue","set","learn","change","lead",
  "understand","watch","follow","stop","create","speak","read","add","spend","grow","open","walk",
  "win","teach","offer","remember","consider","appear","buy","wait","serve","die","send","expect",
  "build","stay","fall","cut","reach","kill","remain","suggest","raise","pass","sell","require",
  "report","decide","pull","also","much","even","still","really","then","right","well","back",
  "now","here","there","many","way","thing","things","something","nothing","anything","everything",
  "one","two","three","first","new","good","bad","long","great","little","big","old","high","small",
  "large","next","early","young","important","last","sure","yes","yeah","ok","okay","oh","um","uh",
  "gonna","wanna","gotta","kinda","sorta","lol","lmao","haha","wow","omg","btw","im","dont","youre",
  "thats","its","ive","id","theyre","hes","shes","whos","whats","cant","wont","didnt","doesnt",
  "isnt","arent","wasnt","werent","havent","hasnt","hadnt","people","video","videos","really",
  "actually","literally","basically","definitely","probably","maybe","please","thanks","thank",
  "subscribe","channel","comment","comments","watch","watching","watched"
]);
