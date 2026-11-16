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
  }
};
export const WORKS={
  "character-actions": {
    "title": "侧视角色动作",
    "category": "side",
    "cover": "./assets/covers/character-actions.svg",
    "first": "terraria"
  }
};
export const REVIEWED_GAMES=new Set(Object.keys(EXHIBITS));
export const gamesForWork=(work)=>Object.entries(EXHIBITS).filter(([,game])=>game.work===work);
export const workForGame=id=>EXHIBITS[id]?.work||'character-actions';
