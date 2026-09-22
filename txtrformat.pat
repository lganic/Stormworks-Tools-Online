struct Txtr {
    char name[4];
    u32 flag;
    u32 format;
    u8 pad;
    u16 height;
    u16 width;
    u16 mipmapcount;
    u32 unknown;
    
    u32 RGBA[width * height];
    
    u16 padding_zero;

};

Txtr test @ 0x00;