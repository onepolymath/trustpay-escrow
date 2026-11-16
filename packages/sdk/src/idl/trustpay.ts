/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/trustpay.json`.
 */
export type Trustpay = {
  "address": "CvbRGAvMeDB3Up6fYa4xBX2GVdYdRKCpq4L5FLaThRBg",
  "metadata": {
    "name": "trustpay",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Escrow with disputes and on-chain vendor reputation for social-commerce payments on Solana",
    "repository": "https://github.com/onepolymath/trustpay-escrow"
  },
  "instructions": [
    {
      "name": "autoRelease",
      "docs": [
        "Permissionless crank: release to the vendor once the confirm window has elapsed."
      ],
      "discriminator": [
        212,
        34,
        30,
        246,
        192,
        13,
        97,
        31
      ],
      "accounts": [
        {
          "name": "cranker",
          "writable": true,
          "signer": true
        },
        {
          "name": "order",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "order.vendor",
                "account": "order"
              },
              {
                "kind": "account",
                "path": "order.order_id",
                "account": "order"
              }
            ]
          }
        },
        {
          "name": "vendorProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  101,
                  110,
                  100,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "order.vendor",
                "account": "order"
              }
            ]
          }
        },
        {
          "name": "buyer",
          "writable": true,
          "relations": [
            "order"
          ]
        },
        {
          "name": "vendor",
          "relations": [
            "order"
          ]
        },
        {
          "name": "mint",
          "relations": [
            "order"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "order"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vendorToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vendor"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "cancelOrder",
      "docs": [
        "Vendor withdraws an order nobody has paid for yet."
      ],
      "discriminator": [
        95,
        129,
        237,
        240,
        8,
        49,
        223,
        132
      ],
      "accounts": [
        {
          "name": "vendor",
          "signer": true,
          "relations": [
            "order"
          ]
        },
        {
          "name": "order",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "vendor"
              },
              {
                "kind": "account",
                "path": "order.order_id",
                "account": "order"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "confirmDelivery",
      "docs": [
        "Buyer releases funds to the vendor."
      ],
      "discriminator": [
        11,
        109,
        227,
        53,
        179,
        190,
        88,
        155
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true,
          "relations": [
            "order"
          ]
        },
        {
          "name": "order",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "order.vendor",
                "account": "order"
              },
              {
                "kind": "account",
                "path": "order.order_id",
                "account": "order"
              }
            ]
          }
        },
        {
          "name": "vendorProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  101,
                  110,
                  100,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "order.vendor",
                "account": "order"
              }
            ]
          }
        },
        {
          "name": "vendor",
          "relations": [
            "order"
          ]
        },
        {
          "name": "mint",
          "relations": [
            "order"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "order"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vendorToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vendor"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createOrder",
      "docs": [
        "Vendor creates a payable order (the thing behind a shareable link / Blink)."
      ],
      "discriminator": [
        141,
        54,
        37,
        207,
        237,
        210,
        250,
        215
      ],
      "accounts": [
        {
          "name": "vendor",
          "writable": true,
          "signer": true,
          "relations": [
            "vendorProfile"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "vendorProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  101,
                  110,
                  100,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "vendor"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "order",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "vendor"
              },
              {
                "kind": "arg",
                "path": "args.order_id"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "createOrderArgs"
            }
          }
        }
      ]
    },
    {
      "name": "fundOrder",
      "docs": [
        "Buyer locks the order amount in escrow. Starts the ship-by clock."
      ],
      "discriminator": [
        224,
        98,
        132,
        110,
        157,
        216,
        234,
        54
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "order",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "order.vendor",
                "account": "order"
              },
              {
                "kind": "account",
                "path": "order.order_id",
                "account": "order"
              }
            ]
          }
        },
        {
          "name": "mint",
          "relations": [
            "order"
          ]
        },
        {
          "name": "buyerToken",
          "writable": true
        },
        {
          "name": "vault",
          "docs": [
            "Canonical ATA owned by the order PDA. `init_if_needed` because anyone can create an ATA,",
            "so plain `init` would let a griefer block funding by pre-creating it."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "order"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeConfig",
      "docs": [
        "One-time setup. Only the program's upgrade authority may call it."
      ],
      "discriminator": [
        208,
        127,
        21,
        1,
        194,
        190,
        196,
        70
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "program",
          "docs": [
            "Only the upgrade authority may create the config, which stops anyone front-running",
            "deployment to install themselves as arbiter."
          ],
          "address": "CvbRGAvMeDB3Up6fYa4xBX2GVdYdRKCpq4L5FLaThRBg"
        },
        {
          "name": "programData"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "arbiter",
          "type": "pubkey"
        },
        {
          "name": "minWindowSecs",
          "type": "i64"
        },
        {
          "name": "maxWindowSecs",
          "type": "i64"
        }
      ]
    },
    {
      "name": "markShipped",
      "docs": [
        "Vendor marks the order shipped. Starts the confirm/dispute clock."
      ],
      "discriminator": [
        239,
        5,
        66,
        105,
        238,
        17,
        89,
        97
      ],
      "accounts": [
        {
          "name": "vendor",
          "signer": true,
          "relations": [
            "order"
          ]
        },
        {
          "name": "order",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "vendor"
              },
              {
                "kind": "account",
                "path": "order.order_id",
                "account": "order"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "tracking",
          "type": "string"
        }
      ]
    },
    {
      "name": "openDispute",
      "docs": [
        "Buyer freezes the funds for the arbiter."
      ],
      "discriminator": [
        137,
        25,
        99,
        119,
        23,
        223,
        161,
        42
      ],
      "accounts": [
        {
          "name": "buyer",
          "signer": true,
          "relations": [
            "order"
          ]
        },
        {
          "name": "order",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "order.vendor",
                "account": "order"
              },
              {
                "kind": "account",
                "path": "order.order_id",
                "account": "order"
              }
            ]
          }
        },
        {
          "name": "vendorProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  101,
                  110,
                  100,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "order.vendor",
                "account": "order"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "reason",
          "type": "string"
        }
      ]
    },
    {
      "name": "reclaimUnshipped",
      "docs": [
        "Buyer reclaims funds if the vendor missed the ship-by deadline."
      ],
      "discriminator": [
        16,
        166,
        62,
        3,
        46,
        234,
        159,
        22
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true,
          "relations": [
            "order"
          ]
        },
        {
          "name": "order",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "order.vendor",
                "account": "order"
              },
              {
                "kind": "account",
                "path": "order.order_id",
                "account": "order"
              }
            ]
          }
        },
        {
          "name": "vendorProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  101,
                  110,
                  100,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "order.vendor",
                "account": "order"
              }
            ]
          }
        },
        {
          "name": "mint",
          "relations": [
            "order"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "order"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "buyerToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "buyer"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "refundByVendor",
      "docs": [
        "Vendor refunds the buyer in full."
      ],
      "discriminator": [
        160,
        86,
        93,
        60,
        110,
        95,
        180,
        178
      ],
      "accounts": [
        {
          "name": "vendor",
          "writable": true,
          "signer": true,
          "relations": [
            "order"
          ]
        },
        {
          "name": "order",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "vendor"
              },
              {
                "kind": "account",
                "path": "order.order_id",
                "account": "order"
              }
            ]
          }
        },
        {
          "name": "vendorProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  101,
                  110,
                  100,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "vendor"
              }
            ]
          }
        },
        {
          "name": "buyer",
          "writable": true,
          "relations": [
            "order"
          ]
        },
        {
          "name": "mint",
          "relations": [
            "order"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "order"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "buyerToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "buyer"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "registerVendor",
      "docs": [
        "Creates the vendor's public reputation record."
      ],
      "discriminator": [
        192,
        133,
        122,
        251,
        31,
        137,
        113,
        141
      ],
      "accounts": [
        {
          "name": "vendor",
          "writable": true,
          "signer": true
        },
        {
          "name": "vendorProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  101,
                  110,
                  100,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "vendor"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "handle",
          "type": "string"
        }
      ]
    },
    {
      "name": "resolveDispute",
      "docs": [
        "Arbiter rules on a dispute: `buyer_bps` of the escrow goes to the buyer, the rest to the",
        "vendor."
      ],
      "discriminator": [
        231,
        6,
        202,
        6,
        96,
        103,
        12,
        230
      ],
      "accounts": [
        {
          "name": "arbiter",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "order",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "order.vendor",
                "account": "order"
              },
              {
                "kind": "account",
                "path": "order.order_id",
                "account": "order"
              }
            ]
          }
        },
        {
          "name": "vendorProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  101,
                  110,
                  100,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "order.vendor",
                "account": "order"
              }
            ]
          }
        },
        {
          "name": "buyer",
          "writable": true,
          "relations": [
            "order"
          ]
        },
        {
          "name": "vendor",
          "relations": [
            "order"
          ]
        },
        {
          "name": "mint",
          "relations": [
            "order"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "order"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "buyerToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "buyer"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vendorToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vendor"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "buyerBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "updateConfig",
      "discriminator": [
        29,
        158,
        252,
        191,
        10,
        83,
        219,
        99
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newAdmin",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "newArbiter",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "windowBounds",
          "type": {
            "option": {
              "defined": {
                "name": "windowBounds"
              }
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "order",
      "discriminator": [
        134,
        173,
        223,
        185,
        77,
        86,
        28,
        51
      ]
    },
    {
      "name": "vendorProfile",
      "discriminator": [
        212,
        127,
        49,
        14,
        158,
        116,
        14,
        66
      ]
    }
  ],
  "events": [
    {
      "name": "configUpdated",
      "discriminator": [
        40,
        241,
        230,
        122,
        11,
        19,
        198,
        194
      ]
    },
    {
      "name": "disputeOpened",
      "discriminator": [
        239,
        222,
        102,
        235,
        193,
        85,
        1,
        214
      ]
    },
    {
      "name": "orderCancelled",
      "discriminator": [
        108,
        56,
        128,
        68,
        168,
        113,
        168,
        239
      ]
    },
    {
      "name": "orderCreated",
      "discriminator": [
        224,
        1,
        229,
        63,
        254,
        60,
        190,
        159
      ]
    },
    {
      "name": "orderFunded",
      "discriminator": [
        33,
        168,
        21,
        171,
        46,
        9,
        84,
        49
      ]
    },
    {
      "name": "orderSettled",
      "discriminator": [
        32,
        21,
        123,
        33,
        68,
        59,
        136,
        131
      ]
    },
    {
      "name": "orderShipped",
      "discriminator": [
        200,
        225,
        83,
        123,
        179,
        86,
        221,
        24
      ]
    },
    {
      "name": "vendorRegistered",
      "discriminator": [
        225,
        58,
        115,
        164,
        235,
        233,
        155,
        161
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidAmount",
      "msg": "Amount must be greater than zero"
    },
    {
      "code": 6001,
      "name": "emptyText",
      "msg": "Text field is empty"
    },
    {
      "code": 6002,
      "name": "textTooLong",
      "msg": "Text field exceeds its maximum length"
    },
    {
      "code": 6003,
      "name": "windowOutOfBounds",
      "msg": "Window is outside the configured bounds"
    },
    {
      "code": 6004,
      "name": "invalidWindowBounds",
      "msg": "Window bounds are invalid"
    },
    {
      "code": 6005,
      "name": "invalidStatus",
      "msg": "Order is not in a state that allows this action"
    },
    {
      "code": 6006,
      "name": "notReservedBuyer",
      "msg": "Order is reserved for a different buyer"
    },
    {
      "code": 6007,
      "name": "selfDealing",
      "msg": "Buyer and vendor must be different wallets"
    },
    {
      "code": 6008,
      "name": "arbiterConflict",
      "msg": "Arbiter cannot be a party to the order"
    },
    {
      "code": 6009,
      "name": "shipDeadlinePassed",
      "msg": "Shipping deadline has passed"
    },
    {
      "code": 6010,
      "name": "shipDeadlineNotReached",
      "msg": "Shipping deadline has not passed yet"
    },
    {
      "code": 6011,
      "name": "disputeWindowClosed",
      "msg": "Dispute window has closed"
    },
    {
      "code": 6012,
      "name": "releaseNotYetDue",
      "msg": "Funds are not yet due for automatic release"
    },
    {
      "code": 6013,
      "name": "invalidBps",
      "msg": "Split must be between 0 and 10000 basis points"
    },
    {
      "code": 6014,
      "name": "unexpectedOrderId",
      "msg": "Order id must equal the vendor's next sequential id"
    },
    {
      "code": 6015,
      "name": "notUpgradeAuthority",
      "msg": "Signer is not the program upgrade authority"
    },
    {
      "code": 6016,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "config",
      "docs": [
        "Singleton protocol configuration."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "docs": [
              "Can rotate the arbiter and tune window bounds. Should be a multisig in production."
            ],
            "type": "pubkey"
          },
          {
            "name": "arbiter",
            "docs": [
              "Sole key allowed to rule on disputes. Should be a Squads multisig in production."
            ],
            "type": "pubkey"
          },
          {
            "name": "minWindowSecs",
            "type": "i64"
          },
          {
            "name": "maxWindowSecs",
            "type": "i64"
          },
          {
            "name": "orderCount",
            "docs": [
              "Total orders ever created, across all vendors."
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "configUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "arbiter",
            "type": "pubkey"
          },
          {
            "name": "minWindowSecs",
            "type": "i64"
          },
          {
            "name": "maxWindowSecs",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "createOrderArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "orderId",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "shipWindowSecs",
            "type": "i64"
          },
          {
            "name": "confirmWindowSecs",
            "type": "i64"
          },
          {
            "name": "buyer",
            "docs": [
              "Lock the order to a single buyer wallet (e.g. a known customer from a DM)."
            ],
            "type": {
              "option": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "disputeOpened",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "order",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "reason",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "order",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vendor",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "docs": [
              "`Pubkey::default()` until funded, unless the vendor reserved the order for one buyer."
            ],
            "type": "pubkey"
          },
          {
            "name": "reservedBuyer",
            "type": "bool"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "orderId",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "orderStatus"
              }
            }
          },
          {
            "name": "shipWindowSecs",
            "type": "i64"
          },
          {
            "name": "confirmWindowSecs",
            "type": "i64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "fundedAt",
            "type": "i64"
          },
          {
            "name": "shipBy",
            "type": "i64"
          },
          {
            "name": "shippedAt",
            "type": "i64"
          },
          {
            "name": "releaseAfter",
            "type": "i64"
          },
          {
            "name": "settledAt",
            "type": "i64"
          },
          {
            "name": "buyerPayout",
            "type": "u64"
          },
          {
            "name": "vendorPayout",
            "type": "u64"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "tracking",
            "type": "string"
          },
          {
            "name": "disputeReason",
            "type": "string"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "orderCancelled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "order",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "orderCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "order",
            "type": "pubkey"
          },
          {
            "name": "vendor",
            "type": "pubkey"
          },
          {
            "name": "orderId",
            "type": "u64"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "reservedBuyer",
            "type": {
              "option": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "orderFunded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "order",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "shipBy",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "orderSettled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "order",
            "type": "pubkey"
          },
          {
            "name": "outcome",
            "type": {
              "defined": {
                "name": "orderStatus"
              }
            }
          },
          {
            "name": "buyerPayout",
            "type": "u64"
          },
          {
            "name": "vendorPayout",
            "type": "u64"
          },
          {
            "name": "settledBy",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "orderShipped",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "order",
            "type": "pubkey"
          },
          {
            "name": "tracking",
            "type": "string"
          },
          {
            "name": "releaseAfter",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "orderStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "created"
          },
          {
            "name": "funded"
          },
          {
            "name": "shipped"
          },
          {
            "name": "disputed"
          },
          {
            "name": "completed"
          },
          {
            "name": "refunded"
          },
          {
            "name": "resolved"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "vendorProfile",
      "docs": [
        "Public, append-only reputation record for a vendor. Only this program can write it."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vendor",
            "type": "pubkey"
          },
          {
            "name": "handle",
            "docs": [
              "Social handle the vendor sells under, e.g. `@ummie.styles`. Self-declared."
            ],
            "type": "string"
          },
          {
            "name": "ordersCreated",
            "docs": [
              "Also the next sequential order id."
            ],
            "type": "u64"
          },
          {
            "name": "completed",
            "docs": [
              "Released to the vendor without a dispute (buyer confirmed or timeout elapsed)."
            ],
            "type": "u32"
          },
          {
            "name": "refunded",
            "docs": [
              "Vendor voluntarily refunded the buyer."
            ],
            "type": "u32"
          },
          {
            "name": "missedShipments",
            "docs": [
              "Vendor took payment but never marked the order shipped before the deadline."
            ],
            "type": "u32"
          },
          {
            "name": "disputesOpened",
            "type": "u32"
          },
          {
            "name": "disputesWon",
            "type": "u32"
          },
          {
            "name": "disputesLost",
            "type": "u32"
          },
          {
            "name": "volumeSettled",
            "docs": [
              "Sum of raw token amounts paid out to the vendor (mixed mints are summed as-is)."
            ],
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "lastActivityAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vendorRegistered",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vendor",
            "type": "pubkey"
          },
          {
            "name": "handle",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "windowBounds",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "minSecs",
            "type": "i64"
          },
          {
            "name": "maxSecs",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
