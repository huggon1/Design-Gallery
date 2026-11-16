export const EXHIBITS={
  "terraria": {
    "category": "side",
    "work": "character-actions",
    "name": "泰拉瑞亚",
    "keys": [
      [
        "W A S D",
        "方向"
      ],
      [
        "Space / K",
        "跳跃 / 脱钩"
      ],
      [
        "S",
        "平台下穿"
      ],
      [
        "鼠标",
        "钩爪瞄准"
      ],
      [
        "I / 右键",
        "发射 / 收回钩爪"
      ]
    ],
    "bindings": {
      "KeyI": "hook",
      "KeyJ": null,
      "KeyL": null
    },
    "inputMode": "aim",
    "mouse": {
      "right": "hook"
    },
    "touch": {
      "jump": "跳",
      "hook": "钩"
    },
    "source": "原角色图层与十四帧步态，固定经典角色和单钩。控制与动作参数按锁定参考重建。",
    "path": "./exhibits/terraria/scene.mjs",
    "links": [
      [
        "参考与制作",
        "./exhibits/terraria/README.md"
      ]
    ]
  },
  "hollow": {
    "category": "side",
    "work": "character-actions",
    "name": "空洞骑士",
    "path": "./exhibits/hollow/scene.mjs",
    "keys": [
      [
        "W A S D",
        "方向"
      ],
      [
        "Space / K",
        "跳跃"
      ],
      [
        "L",
        "冲刺"
      ],
      [
        "J",
        "挥刀"
      ]
    ],
    "touch": {
      "jump": "跳",
      "dash": "冲",
      "attack": "斩"
    },
    "source": "角色、动画与基础控制沿用现有空洞骑士研究。练习场为本展品新建。",
    "links": [
      [
        "参考与制作",
        "./exhibits/hollow/README.md"
      ]
    ]
  },
  "celeste": {
    "category": "side",
    "work": "character-actions",
    "name": "蔚蓝",
    "path": "./exhibits/celeste/scene.mjs",
    "keys": [
      [
        "W A S D",
        "方向"
      ],
      [
        "Space / K",
        "跳跃"
      ],
      [
        "L",
        "冲刺"
      ],
      [
        "J",
        "抓墙"
      ]
    ],
    "bindings": {
      "KeyJ": "grab"
    },
    "touch": {
      "jump": "跳",
      "dash": "冲",
      "grab": "抓"
    },
    "source": "角色、控制器、动画与音效来自 ERI 原版。展厅使用简洁背景和必要的平台、墙面。",
    "links": [
      [
        "参考与制作",
        "./exhibits/celeste/README.md"
      ]
    ]
  },
  "dead-cells": {
    "category": "side",
    "work": "character-actions",
    "name": "死亡细胞",
    "path": "./exhibits/dead-cells/scene.mjs",
    "keys": [
      [
        "W A S D",
        "方向"
      ],
      [
        "Space / K",
        "跳跃"
      ],
      [
        "L",
        "翻滚"
      ],
      [
        "S + Space",
        "下落"
      ],
      [
        "J",
        "挥刀"
      ]
    ],
    "touch": {
      "jump": "跳",
      "dash": "滚",
      "attack": "斩"
    },
    "source": "角色帧与音效来自死亡细胞社区移植素材。控制、动画时长和头部烟雾为本实验重建。",
    "links": [
      [
        "参考与制作",
        "./exhibits/dead-cells/README.md"
      ]
    ]
  },
  "leap-day": {
    "category": "side",
    "work": "character-actions",
    "name": "Leap Day",
    "path": "./exhibits/leap-day/scene.mjs",
    "keys": [
      [
        "Space / K / 点击",
        "跳跃"
      ]
    ],
    "inputMode": "tap",
    "touch": {
      "jump": "跳"
    },
    "source": "Yolk 角色姿势取自原版图片与实机帧。跳跃节奏按 Nitrome 官方连续实机测量重建。",
    "links": [
      [
        "参考与制作",
        "./exhibits/leap-day/README.md"
      ]
    ]
  },
  "katana-zero": {
    "category": "side",
    "work": "character-actions",
    "name": "武士零",
    "keys": [
      [
        "W A S D",
        "方向"
      ],
      [
        "Space / K",
        "跳跃"
      ],
      [
        "J / 左键",
        "斩击"
      ],
      [
        "L",
        "翻滚"
      ],
      [
        "I / 右键",
        "慢动作"
      ]
    ],
    "bindings": {
      "KeyI": "slow"
    },
    "inputMode": "aim",
    "mouse": {
      "left": "attack",
      "right": "slow"
    },
    "touch": {
      "jump": "跳",
      "attack": "斩",
      "dash": "滚",
      "slow": "慢"
    },
    "source": "身体、刀光与尘采用原始帧。跑跳、翻滚、刀反、慢动作的时间与位移为本次重建。",
    "path": "./exhibits/katana-zero/scene.mjs",
    "links": [
      [
        "参考与制作",
        "./exhibits/katana-zero/README.md"
      ]
    ]
  },
  "brotato": {
    "category": "top",
    "work": "topdown-actions",
    "name": "土豆兄弟",
    "keys": [
      [
        "W A S D",
        "移动"
      ],
      [
        "自动",
        "瞄准与攻击"
      ]
    ],
    "bindings": {
      "KeyJ": null,
      "KeyK": null,
      "KeyL": null,
      "Space": null
    },
    "touch": {},
    "source": "全能者与手枪。原图层与原生压缩、双腿动画轨道；目标、射击节奏与音效为本次练习场配置。",
    "path": "./exhibits/brotato/scene.mjs",
    "links": [
      [
        "参考与制作",
        "./exhibits/brotato/README.md"
      ]
    ]
  },
  "gungeon": {
    "category": "top",
    "work": "topdown-actions",
    "name": "挺进地牢",
    "keys": [
      [
        "W A S D",
        "移动"
      ],
      [
        "鼠标",
        "瞄准"
      ],
      [
        "J / 左键",
        "射击"
      ],
      [
        "Space / L",
        "翻滚"
      ],
      [
        "K / U",
        "换弹"
      ]
    ],
    "bindings": {
      "Space": "dash",
      "KeyK": "reload",
      "KeyU": "reload"
    },
    "inputMode": "aim",
    "mouse": {
      "left": "attack"
    },
    "touch": {
      "attack": "射",
      "dash": "滚",
      "reload": "弹"
    },
    "source": "Marine 原始方向帧、九帧翻滚与独立初始手枪。翻滚时间、位移、枪械挂点与声音按参考重建。",
    "path": "./exhibits/gungeon/scene.mjs",
    "links": [
      [
        "参考与制作",
        "./exhibits/gungeon/README.md"
      ]
    ]
  },
  "isaac": {
    "category": "top",
    "work": "topdown-actions",
    "name": "以撒的结合",
    "keys": [
      [
        "W A S D",
        "移动"
      ],
      [
        "↑ ↓ ← → / I K J L",
        "发射"
      ]
    ],
    "bindings": {
      "ArrowUp": "fireUp",
      "ArrowDown": "fireDown",
      "ArrowLeft": "fireLeft",
      "ArrowRight": "fireRight",
      "KeyI": "fireUp",
      "KeyK": "fireDown",
      "KeyJ": "fireLeft",
      "KeyL": "fireRight",
      "Space": null,
      "ShiftLeft": null,
      "ShiftRight": null
    },
    "inputMode": "four-way",
    "touch": {
      "fire": true
    },
    "source": "原始 PNG 与 ANM2 保留头身分向、眼部挂点、普通泪弹与水花。惯性、弹道和声音为本次重建。",
    "path": "./exhibits/isaac/scene.mjs",
    "links": [
      [
        "参考与制作",
        "./exhibits/isaac/README.md"
      ]
    ]
  }
};
export const WORKS={
  "character-actions": {
    "title": "侧视角色动作",
    "category": "side",
    "cover": "./assets/covers/character-actions.svg",
    "first": "terraria"
  },
  "topdown-actions": {
    "title": "俯视移动与瞄准",
    "category": "top",
    "cover": "./assets/covers/topdown-actions.svg",
    "first": "brotato"
  }
};
export const REVIEWED_GAMES=new Set(Object.keys(EXHIBITS));
export const gamesForWork=(work)=>Object.entries(EXHIBITS).filter(([,game])=>game.work===work);
export const workForGame=id=>EXHIBITS[id]?.work||'character-actions';
