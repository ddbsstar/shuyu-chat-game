"use strict";

const stageNames = ["陪伴", "留空间", "抽包", "出国玩", "做顿饭"];

const supportStages = [
  {
    title: "她今天有点低落",
    prompt: "书钰今天想安静一下。她正按医嘱照顾自己，你准备怎么回？",
    message: "今天没什么劲，想慢一点。",
    choices: [
      { label: "先问她想不想有人陪", detail: "她愿意说就听，想安静就陪着。", reply: "那你陪我坐会儿吧。", good: true },
      { label: "马上给她安排满满一天", detail: "不留空档，兴许就不难受了？", reply: "她今天想慢一点。可以先问她希望你怎么陪。", good: false },
    ],
  },
  {
    title: "消息先别连着发",
    prompt: "书钰有些焦虑，想先缓一缓。她会按医嘱照顾自己，你可以决定怎么陪她。",
    message: "我现在有点乱，等我缓一下哈。",
    choices: [
      { label: "跟她说不用急着回", detail: "把什么时候继续聊留给她决定。", reply: "谢谢。等我缓过来就找你。", good: true },
      { label: "接着问她到底怎么了", detail: "一口气发好几条消息。", reply: "她已经说想缓一缓了。换一句不用马上回复的话。", good: false },
    ],
  },
];

const bags = [
  { name: "稻草人", prices: [299, 459, 699] },
  { name: "CK", prices: [699, 899, 1199] },
  { name: "MK", prices: [899, 1299, 1699] },
  { name: "蔻驰", prices: [1299, 1799, 2199] },
  { name: "LV", prices: [7900, 11800, 14500] },
  { name: "香奈儿", prices: [14900, 23900, 32900] },
];

const destinations = [
  { label: "日本 · 京都", detail: "逛小巷，找家店坐下吃点热的。", reply: "走累了就歇一哈，这个行程我喜欢。" },
  { label: "泰国 · 清迈", detail: "去夜市吃东西，第二天睡到自然醒。", reply: "好，明天不起早。这个必须写进行程。" },
  { label: "新加坡 · 滨海湾", detail: "等太阳落山，再去海边散散步。", reply: "我想在海边多坐会儿，别急着赶下一站。" },
];

const meals = [
  { label: "番茄鸡蛋面", detail: "煮一碗热乎的，端上桌就能吃。", reply: "这碗面闻起好香。你也坐下来吃嘛。" },
  { label: "糖醋排骨", detail: "酸甜口，给她留最入味的几块。", reply: "这一块是专门给我留的嗦？那我不客气咯。" },
  { label: "菌菇鸡汤", detail: "慢慢炖，顺手盛两碗。", reply: "汤好了哇？你也喝，莫光给我盛。" },
];

const finalChoices = [
  { label: "你想说我就听，今天想聊啥？", detail: "让她选话题。", good: true },
  { label: "我都准备这么多了，该回我了吧？", detail: "催她给个答复。", good: false },
];

const game = document.querySelector("#game");
const progress = document.querySelector("#progress");
const restart = document.querySelector("#restart");
const priceNote = "价格为游戏虚构，仅用于抽包判定。";
const formatPrice = new Intl.NumberFormat("zh-CN");
let step = 0;
let state = "welcome";
let bagResult = null;
let meal = null;
let drawTimer;

function renderProgress() {
  progress.innerHTML = stageNames.map((name, index) => {
    const done = state === "win" || index < step;
    const current = !done && index === step && state !== "welcome";
    const attributes = done ? ' class="is-complete"' : current ? ' class="is-current" aria-current="step"' : "";
    const number = String(index + 1).padStart(2, "0");
    return '<li' + attributes + '><span class="step-number">' + number + '</span><span class="step-name">' + name + '</span></li>';
  }).join("");
  restart.hidden = state === "welcome";
}

function renderCard({ title, copy = "", body = "", kind = "", meta = "" }) {
  const stepMeta = meta || "第 " + (step + 1) + " 关 · " + stageNames[step];
  game.innerHTML = '<section class="play-card ' + kind + '" aria-labelledby="card-title">'
    + '<div class="step-meta">' + stepMeta + '</div>'
    + '<h2 class="step-title" id="card-title" tabindex="-1">' + title + '</h2>'
    + (copy ? '<p class="step-copy">' + copy + '</p>' : "")
    + body + '</section>';
  renderProgress();
  if (state !== "welcome") {
    const heading = game.querySelector("#card-title");
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: "nearest" });
  }
}

function primary(label, action) {
  return '<button class="primary" type="button" data-action="' + action + '">' + label + '</button>';
}

function choices(items, action) {
  return '<div class="choice-grid">' + items.map((item, index) =>
    '<button class="choice" type="button" data-action="' + action + '" data-index="' + index + '">'
    + '<span>' + item.label + '</span>'
    + (item.detail ? '<small>' + item.detail + '</small>' : "")
    + '</button>').join("") + '</div>';
}

function chat(message) {
  return '<p class="chat-line"><strong>书钰</strong><span>' + message + '</span></p>';
}

function reset() {
  window.clearTimeout(drawTimer);
  step = 0;
  state = "welcome";
  bagResult = null;
  meal = null;
  renderCard({
    title: "今天能和书钰聊上天吗？",
    copy: "从好好听她说话开始，过五关，解锁帝王蟹大餐。",
    meta: "书钰的聊天挑战",
    kind: "welcome",
    body: primary("开始挑战", "start"),
  });
}

function showStage() {
  state = "stage";
  if (step < supportStages.length) {
    const scene = supportStages[step];
    renderCard({
      title: scene.title,
      copy: scene.prompt,
      body: chat(scene.message) + choices(scene.choices, "support") + '<p class="feedback" role="status"></p>',
    });
    return;
  }
  if (step === 2) {
    renderCard({
      title: "抽个包，看手气",
      copy: "选一个品牌抽包。抽到低于 ¥1,000 的包，挑战立刻结束。",
      body: choices(bags.map((bag) => ({ label: bag.name })), "draw") + '<p class="price-note">' + priceNote + '</p>',
    });
    return;
  }
  if (step === 3) {
    renderCard({
      title: "一起出国走走",
      copy: "书钰想换个地方透透气。选一个你们都可以慢慢逛的地方。",
      body: choices(destinations, "travel"),
    });
    return;
  }
  renderCard({
    title: "给书钰做顿吃的",
    copy: "到家了。冰箱里有这些食材，你准备做哪道菜？",
    body: choices(meals, "meal"),
  });
}

function showResponse(title, message) {
  state = "response";
  renderCard({ title, body: chat(message) + primary("去下一关", "next") });
}

function drawBag(bag) {
  state = "drawing";
  renderCard({
    title: "抽包中…",
    copy: "看看这次抽中的包能过关吗。",
    body: '<div class="draw-card" role="status" aria-label="正在抽包">' + bag.name + '</div><p class="price-note">' + priceNote + '</p>',
  });

  drawTimer = window.setTimeout(() => {
    const price = bag.prices[Math.floor(Math.random() * bag.prices.length)];
    bagResult = { name: bag.name, price };
    if (price < 1000) {
      showEnding(false);
      return;
    }
    state = "response";
    renderCard({
      title: "过关了！",
      copy: "这回的包超过了通关线。",
      body: bagReceipt() + chat("包先放一放，走嘛，我们出去转转。") + primary("去下一关", "next"),
    });
  }, 720);
}

function bagReceipt() {
  return '<div class="draw-card"><span>' + bagResult.name + '</span><strong>¥' + formatPrice.format(bagResult.price)
    + '</strong></div><p class="price-note">' + priceNote + '</p>';
}

function showConversation() {
  state = "conversation";
  renderCard({
    title: "这回，聊点啥？",
    copy: "饭做好了。你们坐在一张桌上，她把手机放到了一旁。",
    body: chat(meal.reply) + choices(finalChoices, "chat") + '<p class="feedback" role="status"></p>',
  });
}

function showEnding(won) {
  state = won ? "win" : "fail";
  renderCard({
    title: won ? "书钰请你吃帝王蟹！" : "哎呀，抽包没过关",
    copy: won ? "聊着聊着，她说下次换她请客。" : "这次抽到的包低于 ¥1,000。换个品牌，再来一把。",
    meta: won ? "挑战成功" : "挑战失败",
    kind: "ending",
    body: (won
      ? '<img class="ending-image ending-win" src="assets/ending-win.png" width="532" height="500" alt="书钰捧着帝王蟹">'
      : '<img class="ending-image ending-fail" src="assets/ending-fail.png" width="332" height="578" alt="书钰惊讶的表情">' + bagReceipt())
      + primary("再玩一次", "restart"),
  });
}

game.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const index = Number(button.dataset.index);
  switch (button.dataset.action) {
    case "start":
      showStage();
      break;
    case "support": {
      const choice = supportStages[step].choices[index];
      if (choice.good) showResponse("她愿意多说一句了", choice.reply);
      else game.querySelector(".feedback").textContent = choice.reply;
      break;
    }
    case "draw":
      drawBag(bags[index]);
      break;
    case "travel":
      showResponse(destinations[index].label, destinations[index].reply);
      break;
    case "meal":
      meal = meals[index];
      showConversation();
      break;
    case "chat":
      if (finalChoices[index].good) showEnding(true);
      else game.querySelector(".feedback").textContent = "慢慢来。给她留个开口的机会。";
      break;
    case "next":
      step += 1;
      showStage();
      break;
    case "restart":
      reset();
      game.querySelector("#card-title").focus();
      break;
  }
});

restart.addEventListener("click", () => {
  reset();
  game.querySelector("#card-title").focus();
});

reset();
