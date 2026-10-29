// ==================== 配置文件 ====================
// ⚠️ 安全说明：
//   前端 JS 的任何内容都能被用户在浏览器里看到，所以【线上版本不要在这里填 API Key】。
//   线上：部署 server/worker.js，把 Key 配在 Worker 的环境变量里，然后只填 API_BASE。
//   本地调试：API_BASE 留空，并在下面临时填 Key（调试完删掉，不要提交到 Git / 不要上传到线上）。
const CONFIG = {
  // ========== 后端代理（线上必填） ==========
  // 部署 Worker 后填它的地址，例如 "https://funtool-api.你的子域名.workers.dev"
  // 留空 = 直连模式（仅本地调试用，Key 会暴露在前端）
  API_BASE: "https://api.funtool.dpdns.org",

  // ========== 以下仅【本地直连模式】使用，线上请保持为空 ==========
  DEEPSEEK_API_KEY: "",
  DEEPSEEK_BASE: "https://api.deepseek.com",

  TONGYI_API_KEY: "",
  TONGYI_BASE: "https://dashscope.aliyuncs.com/compatible-mode/v1",

  // 优先使用哪个： "deepseek" | "tongyi"
  LLM_PROVIDER: "deepseek",

  IMAGE_API_KEY: "",   // 硅基流动 Key（旧 Key 已泄露，请到后台删除并重新生成）
  SILICONFLOW_BASE: "https://api.siliconflow.cn/v1",

  // ========== 图片存储 ==========
  // 图片会压缩成 base64 存进收藏，避免签名链接约 1 小时后失效
  IMAGE_SAVE_SIZE: 256,      // 保存的图片边长(px)，越大越清晰但越占空间
  IMAGE_SAVE_QUALITY: 0.8,   // JPEG 质量 0~1

  // ========== 内容安全 ==========
  MAX_INPUT_LEN: 12,         // 每个概念最多多少字

  // ========== 分享海报 ==========
  SITE_NAME: "脑洞进化战",
  SHARE_TEXT: "输入两个概念，AI 帮你合成一只离谱生物",
  SHARE_URL: "https://funtool.dpdns.org",             // 上线后填你的访问地址，会印在海报底部

  // ========== 次数与广告 ==========
  DAILY_FREE_TIMES: 8,
  AD_REWARD_TIMES: 5,
  MAX_DAILY_AD: 6,

  // ========== 其他 ==========
  DEBUG: true
};
