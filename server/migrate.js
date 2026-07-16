import { connect } from '@tidbcloud/serverless';

const DATABASE_URL = 'mysql://4TQx8c28i1TxM2L.root:GQtGpmMlHhGVNU0t@gateway01.eu-central-1.prod.aws.tidbcloud.com/e_commerce';

async function migrate() {
  const conn = connect({ url: DATABASE_URL });
  
  try {
    console.log('Connecting to TiDB...');

    // ============ CLEANUP ORPHAN ORDERS ============
    console.log('Deleting orphan orders (no order_number)...');
    const orphanResult = await conn.execute("DELETE FROM order_info WHERE order_number IS NULL OR order_number = ''");
    const orphanData = Array.isArray(orphanResult) ? orphanResult[0] : orphanResult;
    const orphanCount = orphanData?.affectedRows || orphanData?.rowsAffected || orphanData?.numRows || 0;
    console.log(`  ✓ Deleted ${orphanCount} orphan order(s)`);
    

    

    // ============ ORDERS TABLE MIGRATION ============

    // Add order_number column to order_info (UNIQUE added separately since TiDB doesn't support it in ADD COLUMN)
    const checkOrderNumberRows = await conn.execute('SHOW COLUMNS FROM order_info LIKE ?', ['order_number']);
    const hasOrderNumber = Array.isArray(checkOrderNumberRows) && checkOrderNumberRows.length > 0;
    if (!hasOrderNumber) {
      console.log('Adding order_number column to order_info...');
      await conn.execute('ALTER TABLE order_info ADD COLUMN order_number VARCHAR(20) AFTER id');
      console.log('  ✓ order_number column added');

      // Add unique index on order_number separately
      console.log('Adding unique index on order_number...');
      try {
        await conn.execute('ALTER TABLE order_info ADD UNIQUE INDEX idx_order_number (order_number)');
        console.log('  ✓ unique index added');
      } catch (err) {
        console.log(`  - Could not add unique index: ${err.message}`);
      }
    } else {
      console.log('  - order_number already exists, checking unique index...');
      const checkUniqueRows = await conn.execute('SHOW INDEX FROM order_info WHERE Column_name = ?', ['order_number']);
      const hasUniqueIndex = Array.isArray(checkUniqueRows) && checkUniqueRows.length > 0;
      if (!hasUniqueIndex) {
        console.log('Adding unique index on order_number...');
        try {
          await conn.execute('ALTER TABLE order_info ADD UNIQUE INDEX idx_order_number (order_number)');
          console.log('  ✓ unique index added');
        } catch (err) {
          console.log(`  - Could not add unique index: ${err.message}`);
        }
      } else {
        console.log('  - unique index already exists, skipping');
      }
    }

    // Add current_status column to order_info (after status)
    const checkCurrentStatusRows = await conn.execute('SHOW COLUMNS FROM order_info LIKE ?', ['current_status']);
    const hasCurrentStatus = Array.isArray(checkCurrentStatusRows) && checkCurrentStatusRows.length > 0;
    if (!hasCurrentStatus) {
      console.log('Adding current_status column to order_info...');
      await conn.execute("ALTER TABLE order_info ADD COLUMN current_status VARCHAR(50) DEFAULT 'new' AFTER status");
      console.log('  ✓ current_status column added');
    } else {
      console.log('  - current_status already exists, skipping');
    }

    // Backfill existing orders with order_number and migrate status
    const existingOrders = await conn.execute('SELECT id FROM order_info WHERE order_number IS NULL');
    const ordersToMigrate = Array.isArray(existingOrders) ? existingOrders : (existingOrders[0] || []);
    
    if (ordersToMigrate.length > 0) {
      console.log(`Backfilling ${ordersToMigrate.length} orders...`);
      
      for (const order of ordersToMigrate) {
        const id = order.id || order;
        // Generate random order number: 8 hex chars - 6 hex chars
        const p1 = Math.random().toString(16).substring(2, 10).toUpperCase();
        const p2 = Math.random().toString(16).substring(2, 8).toUpperCase();
        const orderNumber = `${p1}-${p2}`;
        
        await conn.execute(
          'UPDATE order_info SET order_number = ? WHERE id = ?',
          [orderNumber, id]
        );
      }
      
      // Migrate old status values to current_status (only if status column still exists)
      const checkOldStatus = await conn.execute('SHOW COLUMNS FROM order_info LIKE ?', ['status']);
      const hasOldStatus = Array.isArray(checkOldStatus) && checkOldStatus.length > 0;
      if (hasOldStatus) {
        await conn.execute("UPDATE order_info SET current_status = 'new' WHERE status = 'pending' AND current_status = 'new'");
        await conn.execute("UPDATE order_info SET current_status = 'confirmed' WHERE status = 'accepted'");
        await conn.execute("UPDATE order_info SET current_status = 'ملغي من المتجر' WHERE status = 'rejected'");
        await conn.execute("UPDATE order_info SET current_status = 'تم التوصيل' WHERE status = 'completed'");
      }
      
      console.log('  ✓ Orders backfilled with order numbers and current_status');
    } else {
      console.log('  - All orders already have order numbers, skipping backfill');
    }

    // Drop old status column
    const checkStatusRows = await conn.execute('SHOW COLUMNS FROM order_info LIKE ?', ['status']);
    const hasStatus = Array.isArray(checkStatusRows) && checkStatusRows.length > 0;
    if (hasStatus) {
      console.log('Dropping old status column...');
      try {
        await conn.execute('ALTER TABLE order_info DROP COLUMN status');
        console.log('  ✓ status column dropped');
      } catch (err) {
        console.log(`  - Could not drop status column: ${err.message}`);
      }
    } else {
      console.log('  - status column already removed, skipping');
    }

    // ============ FREE DELIVERY COLUMN ============
    const checkFreeDeliveryRows = await conn.execute('SHOW COLUMNS FROM order_info LIKE ?', ['free_delivery']);
    const hasFreeDelivery = Array.isArray(checkFreeDeliveryRows) && checkFreeDeliveryRows.length > 0;
    if (!hasFreeDelivery) {
      console.log('Adding free_delivery column to order_info...');
      await conn.execute("ALTER TABLE order_info ADD COLUMN free_delivery BOOLEAN DEFAULT 0 AFTER delivery_Price");
      console.log('  ✓ free_delivery column added');
    } else {
      console.log('  - free_delivery already exists, skipping');
    }

    // ============ LEFTED ORDERS TABLE ============
    const checkLeftedTable = await conn.execute("SHOW TABLES LIKE 'lefted_orders'");
    const hasLeftedTable = Array.isArray(checkLeftedTable) && checkLeftedTable.length > 0;
    if (!hasLeftedTable) {
      console.log('Creating lefted_orders table...');
      await conn.execute(`
        CREATE TABLE lefted_orders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          phone VARCHAR(20) NOT NULL DEFAULT '',
          first_name VARCHAR(100) DEFAULT '',
          last_name VARCHAR(100) DEFAULT '',
          wilaya VARCHAR(100) DEFAULT '',
          wilaya_code VARCHAR(10) DEFAULT '',
          baladiya VARCHAR(100) DEFAULT '',
          delivery_type VARCHAR(20) DEFAULT 'domicile',
          product_id INT,
          product_name VARCHAR(255) DEFAULT '',
          product_price DECIMAL(10,2) DEFAULT 0,
          quantity INT DEFAULT 1,
          color_name VARCHAR(255) DEFAULT '',
          color_hex VARCHAR(100) DEFAULT '',
          colors TEXT DEFAULT NULL,
          delivery_price DECIMAL(10,2) DEFAULT 0,
          offer_text VARCHAR(255) DEFAULT '',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('  ✓ lefted_orders table created');
    } else {
      console.log('  - lefted_orders already exists, checking column sizes...');

      try { await conn.execute("ALTER TABLE lefted_orders MODIFY COLUMN color_name VARCHAR(255) DEFAULT ''"); console.log('  ✓ color_name widened'); } catch (_) {}
      try { await conn.execute("ALTER TABLE lefted_orders MODIFY COLUMN color_hex VARCHAR(100) DEFAULT ''"); console.log('  ✓ color_hex widened'); } catch (_) {}

      const checkDeliveryPrice = await conn.execute("SHOW COLUMNS FROM lefted_orders LIKE 'delivery_price'");
      const hasDeliveryPrice = Array.isArray(checkDeliveryPrice) && checkDeliveryPrice.length > 0;
      if (!hasDeliveryPrice) {
        console.log('Adding delivery_price column...');
        try {
          await conn.execute("ALTER TABLE lefted_orders ADD COLUMN delivery_price DECIMAL(10,2) DEFAULT 0 AFTER colors");
          console.log('  ✓ delivery_price column added');
        } catch (err) {
          console.log(`  - Could not add delivery_price column: ${err.message}`);
        }
      } else {
        console.log('  - delivery_price already exists, skipping');
      }
    }

    const checkColorsColumn = await conn.execute("SHOW COLUMNS FROM lefted_orders LIKE 'colors'");
    const hasColorsColumn = Array.isArray(checkColorsColumn) && checkColorsColumn.length > 0;
    if (!hasColorsColumn) {
      console.log('Adding colors JSON column to lefted_orders...');
      try {
        await conn.execute("ALTER TABLE lefted_orders ADD COLUMN colors TEXT DEFAULT NULL AFTER color_hex");
        console.log('  ✓ colors column added');

        const backfillRows = await conn.execute("SELECT id, color_name, color_hex, quantity FROM lefted_orders WHERE color_name != '' AND colors IS NULL");
        const backfillData = Array.isArray(backfillRows) ? backfillRows : (backfillRows[0] || []);
        if (backfillData.length > 0) {
          console.log(`  Backfilling ${backfillData.length} rows with colors data...`);
          for (const row of backfillData) {
            const names = (row.color_name || '').split(/,\s*/).filter(Boolean);
            const hexes = (row.color_hex || '').split(',').filter(Boolean);
            const totalQty = Number(row.quantity) || 1;
            const perQty = Math.floor(totalQty / (names.length || 1));
            const colorsArr = names.map((name, i) => ({
              name,
              hex: hexes[i] || '',
              quantity: i === names.length - 1 ? totalQty - perQty * (names.length - 1) : perQty
            }));
            await conn.execute('UPDATE lefted_orders SET colors = ? WHERE id = ?', [JSON.stringify(colorsArr), row.id]);
          }
          console.log('  ✓ existing data backfilled');
        }
      } catch (err) {
        console.log(`  - Could not add colors column: ${err.message}`);
      }
    } else {
      console.log('  - colors column already exists, skipping');
    }

    // ============ DELIVERY TABLES ============
    // Data for baladiyas seeding
    const wilayaMunicipalities = {
      "01":["Adrar","Akabli","Aoulef","Bouda","Fenoughil","In Zghmir","Ouled Ahmed Timmi","Reggane","Sali","Sebaa","Tamantit","Tamest","Timekten","Tit","Tsabit","Zaouiet Kounta"],
      "02":["Abou El Hassan","Ain Merane","Benairia","Beni Bouattab","Beni Haoua","Beni Rached","Boukadir","Bouzeghaia","Breira","Chettia","Chlef","Dahra","El Hadjadj","El Karimia","El Marsa","Harchoun","Herenfa","Labiod Medjadja","Moussadek","Oued Fodda","Oued Goussine","Oued Sly","Ouled Abbes","Ouled Ben Abdelkader","Ouled Fares","Oum Drou","Sendjas","Sidi Abderrahmane","Sidi Akkacha","Sobha","Tadjena","Talassa","Taougrite","Tenes","Zeboudja"],
      "03":["Aflou","Ain Madhi","Ain Sidi Ali","Beidha","Benacer Benchohra","Brida","El Assafia","El Ghicha","El Haouaita","Gueltat Sidi Saad","Hadj Mechri","Hassi Delaa","Hassi R'mel","Kheneg","Ksar El Hirane","Laghouat","Oued M'zi","Oued Morra","Sebgag","Sidi Bouzid","Sidi Makhlouf","Tadjemout","Tadjrouna","Taouiala"],
      "04":["Ain Babouche","Ain Beida","Ain Diss","Ain Fekroune","Ain Kercha","Ain M'lila","Ain Zitoun","Behir Chergui","Berriche","Bir Chouhada","Dhala","El Amiria","El Belala","El Djazia","El Fedjoudj Boughrara Sa","El Harmilia","Fkirina","Hanchir Toumghani","Ksar Sbahi","Meskiana","Oued Nini","Ouled Gacem","Ouled Hamla","Ouled Zouai","Oum El Bouaghi","Rahia","Sigus","Souk Naamane","Zorg"],
      "05":["Ain Djasser","Ain Touta","Ain Yagout","Arris","Azil Abedelkader","Barika","Batna","Beni Foudhala El Hakania","Bitam","Boulhilat","Boumagueur","Boumia","Bouzina","Chemora","Chir","Djerma","Djezzar","El Hassi","El Madher","Fesdis","Foum Toub","Ghassira","Gosbat","Guigba","Hidoussa","Ichmoul","Inoughissen","Kimmel","Ksar Bellezma","Larbaa","Lazrou","Lemsane","M Doukal","Maafa","Menaa","Merouana","N Gaous","Oued Chaaba","Oued El Ma","Oued Taga","Ouled Ammar","Ouled Aouf","Ouled Fadel","Ouled Sellem","Ouled Si Slimane","Ouyoun El Assafir","Rahbat","Ras El Aioun","Sefiane","Seggana","Seriana","T Kout","Talkhamt","Taxlent","Tazoult","Teniet El Abed","Tighanimine","Tigharghar","Tilatou","Timgad","Zanet El Beida"],
      "06":["Adekar","Ait R'zine","Ait Smail","Akbou","Akfadou","Amalou","Amizour","Aokas","Barbacha","Bejaia","Beni Dejllil","Beni K'sila","Beni Mallikeche","Benimaouche","Boudjellil","Bouhamza","Boukhelifa","Chellata","Chemini","Darghina","Dra El Caid","El Kseur","Fenaia Il Maten","Feraoun","Ighil Ali","Ighram","Kendira","Kherrata","Leflaye","M'cisna","Melbou","Oued Ghir","Ouzellaguene","Seddouk","Sidi Aich","Sidi Ayad","Smaoun","Souk El Tenine","Souk Oufella","Tala Hamza","Tamokra","Tamridjet","Taourit Ighil","Taskriout","Tazmalt","Tibane","Tichy","Tifra","Timezrit","Tinebdar","Tizi N'berber","Toudja"],
      "07":["Ain Naga","Ain Zaatout","Biskra","Bordj Ben Azzouz","Bouchagroun","Branis","Chetma","Djemorah","El Feidh","El Ghrous","El Hadjab","El Haouch","El Kantara","El Outaya","Foughala","Khenguet Sidi Nadji","Lichana","Lioua","M'chouneche","M'lili","Mekhadma","Meziraa","Oumache","Ourlal","Sidi Okba","Tolga","Zeribet El Oued"],
      "08":["Abadla","Bechar","Beni Ounif","Boukais","Erg Ferradj","Kenadsa","Lahmar","Mechraa H.boumediene","Meridja","Mogheul","Taghit"],
      "09":["Ain Romana","Beni Mered","Beni Tamou","Benkhelil","Blida","Bouarfa","Boufarik","Bougara","Bouinan","Chebli","Chiffa","Chrea","Djebabra","El Affroun","Guerrouaou","Hammam Melouane","Larbaa","Meftah","Mouzaia","Oued Djer","Oued El Alleug","Ouled Slama","Ouled Yaich","Souhane","Souma"],
      "10":["Aghbalou","Ahl El Ksar","Ain Bessem","Ain El Hadjar","Ain Laloui","Ain Turk","Ait Laaziz","Aomar","Bechloul","Bir Ghbalou","Bordj Okhriss","Bouderbala","Bouira","Boukram","Chorfa","Dechmia","Dirah","Djebahia","El Adjiba","El Asnam","El Hachimia","El Hakimia","El Khabouzia","El Mokrani","Guerrouma","Hadjera Zerga","Haizer","Hanif","Kadiria","Lakhdaria","M Chedallah","Maala","Mamora","Mezdour","Oued El Berdi","Ouled Rached","Raouraoua","Ridane","Saharidj","Souk El Khemis","Sour El Ghozlane","Taghzout","Taguedite","Taourirt","Z'barbar"],
      "11":["Abalessa","Ain Amguel","Idles","Tamanrasset","Tazrouk"],
      "12":["Ain Zerga","Bedjene","Bekkaria","Bir Dheheb","Bir El Ater","Bir Mokkadem","Boukhadra","Boulhaf Dyr","Cheria","El Aouinet","El Houidjbet","El Kouif","El Malabiod","El Meridj","El Mezeraa","El Ogla","El Ogla El Malha","Ferkane","Guorriguer","Hammamet","Morssot","Negrine","Ouenza","Oum Ali","Saf Saf El Ouesra","Stah Guentis","Tebessa","Telidjen"],
      "13":["Ain Fettah","Ain Fezza","Ain Ghoraba","Ain Kebira","Ain Nehala","Ain Tallout","Ain Youcef","Amieur","Azails","Bab El Assa","Beni Bahdel","Beni Boussaid","Beni Khaled","Beni Mester","Beni Ouarsous","Beni Smiel","Beni Snous","Bensekrane","Bouhlou","Bouihi","Chetouane","Dar Yaghmouracene","Djebala","El Aricha","El Fehoul","El Gor","Fellaoucene","Ghazaouet","Hammam Boughrara","Hennaya","Honaine","Maghnia","Mansourah","Marsa Ben M'hidi","Msirda Fouaga","Nedroma","Oued Chouly","Ouled Mimoun","Ouled Riyah","Remchi","Sabra","Sebbaa Chioukh","Sebdou","Sidi Abdelli","Sidi Djilali","Sidi Medjahed","Souahlia","Souani","Souk Tleta","Terny Beni Hediel","Tianet","Tlemcen","Zenata"],
      "14":["Ain Bouchekif","Ain Deheb","Ain El Hadid","Ain Kermes","Ain Zarit","Bougara","Chehaima","Dahmouni","Djebilet Rosfa","Djillali Ben Amar","Faidja","Frenda","Guertoufa","Hamadia","Ksar Chellala","Madna","Mahdia","Mechraa Safa","Medrissa","Medroussa","Meghila","Mellakou","Nadorah","Naima","Oued Lilli","Rahouia","Rechaiga","Sebaine","Sebt","Serghine","Si Abdelghani","Sidi Abderrahmane","Sidi Ali Mellal","Sidi Bakhti","Sidi Hosni","Sougueur","Tagdemt","Takhemaret","Tiaret","Tidda","Tousnina","Zmalet El Emir Abdelkade"],
      "15":["Abi Youcef","Aghribs","Agouni Gueghrane","Ain El Hammam","Ain Zaouia","Ait Aggouacha","Ait Bouaddou","Ait Boumehdi","Ait Chafaa","Ait Khellili","Ait Mahmoud","Ait Oumalou","Ait Toudert","Ait Yahia","Ait Yahia Moussa","Akbil","Akerrou","Assi Youcef","Azazga","Azeffoun","Beni Aissi","Beni Douala","Beni Yenni","Beni Zikki","Beni Zmenzer","Boghni","Boudjima","Bounouh","Bouzeguene","Djebel Aissa Mimoun","Draa Ben Khedda","Draa El Mizan","Freha","Frikat","Iboudrarene","Idjeur","Iferhounene","Ifigha","Iflissen","Illilten","Illoula Oumalou","Imsouhal","Irdjen","Larba Nath Irathen","Larbaa Nath Irathen","M'kira","Maatkas","Makouda","Mechtras","Mekla","Mizrana","Ouacif","Ouadhias","Ouaguenoune","Sidi Naamane","Souamaa","Souk El Thenine","Tadmait","Tigzirt","Timizart","Tirmitine","Tizi Ghenif","Tizi N'tleta","Tizi Ouzou","Tizi Rached","Yakourene","Yatafene","Zekri"],
      "16":["Ain Benian","Ain Taya","Alger Centre","Bab El Oued","Bab Ezzouar","Baba Hesen","Bachedjerah","Bains Romains","Baraki","Ben Aknoun","Beni Messous","Bir Mourad Rais","Bir Touta","Birkhadem","Bologhine Ibnou Ziri","Bordj El Bahri","Bordj El Kiffan","Bourouba","Bouzareah","Casbah","Cheraga","Dar El Beida","Dely Ibrahim","Djasr Kasentina","Douira","Draria","El Achour","El Biar","El Harrach","El Madania","El Magharia","El Merssa","El Mouradia","Herraoua","Hussein Dey","Hydra","Kheraisia","Kouba","Les Eucalyptus","Maalma","Mohamed Belouzdad","Mohammadia","Oued Koriche","Oued Smar","Ouled Chebel","Ouled Fayet","Rahmania","Rais Hamidou","Reghaia","Rouiba","Sehaoula","Setaouali","Sidi M'hamed","Sidi Moussa","Souidania","Tessala El Merdja","Zeralda"],
      "17":["Ain Chouhada","Ain El Ibel","Ain Fekka","Ain Maabed","Ain Oussera","Amourah","Benhar","Benyagoub","Birine","Bouira Lahdab","Charef","Dar Chioukh","Deldoul","Djelfa","Douis","El Guedid","El Idrissia","El Khemis","Faidh El Botma","Guernini","Guettara","Had Sahary","Hassi Bahbah","Hassi El Euch","Hassi Fedoul","M Liliha","Messaad","Moudjebara","Oum Laadham","Sed Rahal","Selmana","Sidi Baizid","Sidi Ladjel","Tadmit","Zaafrane","Zaccar"],
      "18":["Bordj Tahar","Boudria Beniyadjis","Bouraoui Belhadef","Boussif Ouled Askeur","Chahna","Chekfa","Djemaa Beni Habibi","Djimla","El Ancer","El Aouana","El Kennar Nouchfi","El Milia","Emir Abdelkader","Erraguene","Ghebala","Jijel","Khiri Oued Adjoul","Kouas","Oudjana","Ouled Rabah","Ouled Yahia Khadrouch","Selma Benziada","Settara","Sidi Abdelaziz","Sidi Marouf","Taher","Texena","Ziama Mansouria"],
      "19":["Ain Abessa","Ain Arnat","Ain Azel","Ain El Kebira","Ain Lahdjar","Ain Legradj","Ain Oulmane","Ain Roua","Ain Sebt","Ait Naoual Mezada","Ait Tizi","Amoucha","Babor","Bazer Sakra","Beidha Bordj","Bellaa","Beni Aziz","Beni Chebana","Beni Fouda","Beni Mouhli","Beni Ouartilane","Beni Oussine","Bir El Arch","Bir Haddada","Bouandas","Bougaa","Bousselam","Boutaleb","Dehamcha","Djemila","Draa Kebila","El Eulma","El Ouldja","El Ouricia","Guellal","Guelta Zerka","Guenzet","Guidjel","Hamam Soukhna","Hamma","Hammam Guergour","Harbil","Ksar El Abtal","Maaouia","Maouaklane","Mezloug","Oued El Barad","Ouled Addouane","Ouled Sabor","Ouled Si Ahmed","Ouled Tebben","Rosfa","Salah Bey","Serdj El Ghoul","Setif","Tachouda","Tala Ifacene","Taya","Tella","Tizi N'bechar"],
      "20":["Ain El Hadjar","Ain Sekhouna","Ain Soltane","Doui Thabet","El Hassasna","Hounet","Maamora","Moulay Larbi","Ouled Brahim","Ouled Khaled","Saida","Sidi Ahmed","Sidi Amar","Sidi Boubekeur","Tircine","Youb"],
      "21":["Ain Bouziane","Ain Charchar","Ain Kechera","Ain Zouit","Azzaba","Bekkouche Lakhdar","Ben Azzouz","Beni Bechir","Beni Oulbane","Beni Zid","Bin El Ouiden","Bouchetata","Cheraia","Collo","Djendel Saadi Mohamed","El Arrouch","El Ghedir","El Hadaiek","El Marsa","Emjez Edchich","Es Sebt","Filfila","Hamadi Krouma","Kanoua","Kerkera","Khenag Mayoum","Oued Zhour","Ouldja Boulbalout","Ouled Attia","Ouled Habbeba","Oum Toub","Ramdane Djamel","Salah Bouchaour","Sidi Mezghiche","Skikda","Tamalous","Zerdezas","Zitouna"],
      "22":["Ain Adden","Ain El Berd","Ain Kada","Ain Thrid","Ain Tindamine","Amarnas","Badredine El Mokrani","Belarbi","Ben Badis","Benachiba Chelia","Bir El Hammam","Boudjebaa El Bordj","Boukhanafis","Chetouane Belaila","Dhaya","El Hacaiba","Hassi Dahou","Hassi Zahana","Lamtar","M'cid","Makedra","Marhoum","Merine","Mezaourou","Mostefa Ben Brahim","Moulay Slissen","Oued Sebaa","Oued Sefioun","Oued Taourira","Ras El Ma","Redjem Demouche","Sehala Thaoura","Sfissef","Sidi Ali Benyoub","Sidi Ali Boussidi","Sidi Bel Abbes","Sidi Brahim","Sidi Chaib","Sidi Dahou Zairs","Sidi Hamadouche","Sidi Khaled","Sidi Lahcene","Sidi Yacoub","Tabia","Tafissour","Taoudmout","Teghalimet","Telagh","Tenira","Tessala","Tilmouni","Zerouala"],
      "23":["Ain Berda","Annaba","Berrahel","Chetaibi","Cheurfa","El Bouni","El Hadjar","Eulma","Oued El Aneb","Seraidi","Sidi Amar","Treat"],
      "24":["Ain Ben Beida","Ain Hessania","Ain Larbi","Ain Makhlouf","Ain Reggada","Belkheir","Ben Djarah","Beni Mezline","Bordj Sabat","Bou Hachana","Bou Hamdane","Bouati Mahmoud","Bouchegouf","Bouhamra Ahmed","Dahouara","Djeballah Khemissi","El Fedjoudj","Guelaat Bou Sbaa","Guelma","Hamam Debagh","Hammam N'bail","Heliopolis","Khezara","Medjez Amar","Medjez Sfa","Nechmaya","Oued Cheham","Oued Fragha","Oued Zenati","Ras El Agba","Roknia","Sellaoua Announa","Sidi Sandel","Tamlouka"],
      "25":["Ain Abid","Ain Smara","Ben Badis","Beni Hamidene","Constantine","Didouche Mourad","El Khroub","Hamma Bouziane","Ibn Ziad","Messaoud Boujeriou","Ouled Rahmouni","Zighoud Youcef"],
      "26":["Ain Boucif","Ain Ouksir","Aissaouia","Aziz","Baata","Ben Chicao","Beni Slimane","Berrouaghia","Bir Ben Laabed","Boghar","Bouaiche","Bouaichoune","Bouchrahil","Boughzoul","Bouskene","Chabounia","Chelalet El Adhaoura","Cheniguel","Damiat","Derrag","Deux Bassins","Djouab","Draa Essamar","El Azizia","El Guelbelkebir","El Hamdania","El Omaria","El Ouinet","Hannacha","Kef Lakhdar","Khams Djouamaa","Ksar El Boukhari","Maghraoua","Medea","Medjebar","Meftaha","Mezerana","Mihoub","Ouamri","Oued Harbil","Ouled Antar","Ouled Bouachra","Ouled Brahim","Ouled Deid","Ouled Hellal","Ouled Maaref","Oum El Djellil","Ouzera","Rebaia","Saneg","Sedraya","Seghouane","Si Mahdjoub","Sidi Demed","Sidi Naamane","Sidi Rabie","Sidi Zahar","Sidi Ziane","Souagui","Tablat","Tafraout","Tamesguida","Tletat Ed Douair","Zoubiria"],
      "27":["Achaacha","Ain Boudinar","Ain Nouissy","Ain Sidi Cherif","Ain Tedles","Benabdelmalek Ramdane","Bouguirat","Fornaka","Hadjadj","Hassi Mameche","Hassiane","Khadra","Kheir Eddine","Mansourah","Mazagran","Mesra","Mostaganem","Nekmaria","Oued El Kheir","Ouled Boughalem","Ouled Maalah","Safsaf","Sayada","Sidi Ali","Sidi Belaattar","Sidi Lakhdar","Sirat","Souaflia","Sour","Stidia","Tazgait","Touahria"],
      "28":["Ain El Hadjel","Ain El Melh","Ain Fares","Ain Khadra","Ain Rich","Belaiba","Ben Srour","Beni Ilmane","Benzouh","Berhoum","Bir Foda","Bou Saada","Bouti Sayeh","Chellal","Dehahna","Djebel Messaad","El Hamel","El Houamed","Hammam Dalaa","Khettouti Sed El Jir","Khoubana","M'cif","M'sila","M'tarfa","Maadid","Maarif","Magra","Medjedel","Menaa","Mohamed Boudiaf","Ouanougha","Ouled Addi Guebala","Ouled Derradj","Ouled Madhi","Ouled Mansour","Ouled Sidi Brahim","Ouled Slimane","Oulteme","Sidi Aissa","Sidi Ameur","Sidi Hadjeres","Sidi M'hamed","Slim","Souamaa","Tamsa","Tarmount","Zarzour"],
      "29":["Ain Fares","Ain Fekan","Ain Ferah","Ain Frass","Alaimia","Aouf","Benian","Bou Henni","Bouhanifia","Chorfa","El Bordj","El Gaada","El Ghomri","El Gueitena","El Hachem","El Keurt","El Mamounia","El Menaouer","Ferraguig","Froha","Gharrous","Ghriss","Guerdjoum","Hacine","Khalouia","Makhda","Maoussa","Mascara","Matemore","Mocta Douz","Mohammadia","Nesmot","Oggaz","Oued El Abtal","Oued Taria","Ras El Ain Amirouche","Sedjerara","Sehailia","Sidi Abdeldjebar","Sidi Abdelmoumene","Sidi Boussaid","Sidi Kada","Sig","Tighennif","Tizi","Zahana","Zelamta"],
      "30":["Ain Beida","El Borma","Hassi Ben Abdellah","Hassi Messaoud","N'goussa","Ouargla","Rouissat","Sidi Khouiled"],
      "31":["Ain Biya","Ain Kerma","Ain Turk","Arzew","Ben Freha","Bethioua","Bir El Djir","Boufatis","Bousfer","Boutlelis","El Ancar","El Braya","El Kerma","Es Senia","Gdyel","Hassi Ben Okba","Hassi Bounif","Hassi Mefsoukh","Marsat El Hadjadj","Mers El Kebir","Messerghin","Oran","Oued Tlelat","Sidi Ben Yebka","Sidi Chami","Tafraoui"],
      "32":["Ain El Orak","Arbaouat","Boualem","Bougtoub","Boussemghoun","Brezina","Cheguig","Chellala","El Bayadh","El Biodh Sidi Cheikh","El Bnoud","El Kheither","El Mehara","Ghassoul","Kef El Ahmar","Krakda","Rogassa","Sidi Ameur","Sidi Slimane","Sidi Tifour","Stitten","Tousmouline"],
      "33":["Bordj Omar Driss","Debdeb","Illizi","In Amenas"],
      "34":["Ain Taghrout","Ain Tesra","Belimour","Ben Daoud","Bir Kasdali","Bordj Bou Arreridj","Bordj Ghdir","Bordj Zemora","Colla","Djaafra","El Ach","El Achir","El Anseur","El Hamadia","El M'hir","El Main","Ghilassa","Haraza","Hasnaoua","Khelil","Ksour","Mansoura","Medjana","Ouled Brahem","Ouled Dahmane","Ouled Sidi Brahim","Rabta","Ras El Oued","Sidi Embarek","Tafreg","Taglait","Teniet En Nasr","Tesmart","Tixter"],
      "35":["Afir","Ammal","Baghlia","Ben Choud","Beni Amrane","Bordj Menaiel","Boudouaou","Boudouaou El Bahri","Boumerdes","Bouzegza Keddara","Chabet El Ameur","Corso","Dellys","Djinet","El Kharrouba","Hammedi","Isser","Khemis El Khechna","Larbatache","Leghata","Naciria","Ouled Aissa","Ouled Hedadj","Ouled Moussa","Si Mustapha","Sidi Daoud","Souk El Haad","Taourga","Thenia","Tidjelabine","Timezrit","Zemmouri"],
      "36":["Ain El Assel","Ain Kerma","Asfour","Ben M Hidi","Berrihane","Besbes","Bougous","Bouhadjar","Bouteldja","Chebaita Mokhtar","Chefia","Chihani","Drean","Echatt","El Aioun","El Kala","El Tarf","Hammam Beni Salah","Lac Des Oiseaux","Oued Zitoun","Raml Souk","Souarekh","Zerizer","Zitouna"],
      "37":["Oum El Assel","Tindouf"],
      "38":["Ammari","Beni Chaib","Beni Lahcene","Bordj Bounaama","Bordj El Emir Abdelkader","Bou Caid","Khemisti","Larbaa","Lardjem","Layoune","Lazharia","Maacem","Melaab","Ouled Bessem","Sidi Abed","Sidi Boutouchent","Sidi Lantri","Sidi Slimane","Tamellalet","Theniet El Had","Tissemsilt","Youssoufia"],
      "39":["Bayadha","Ben Guecha","Debila","Douar El Maa","El Ogla","El Oued","Guemar","Hamraia","Hassani Abdelkrim","Hassi Khalifa","Kouinine","Magrane","Mih Ouansa","Nakhla","Oued El Alenda","Ourmes","Reguiba","Robbah","Sidi Aoun","Taghzout","Taleb Larbi","Trifaoui"],
      "40":["Ain Touila","Babar","Baghai","Bouhmama","Chelia","Cherchar","Djellal","El Hamma","El Mahmal","El Oueldja","Ensigha","Kais","Khenchela","Khirane","M'sara","M'toussa","Ouled Rechache","Remila","Tamza","Taouzianat","Yabous"],
      "41":["Ain Soltane","Ain Zana","Bir Bouhouche","Drea","Haddada","Hanencha","Khedara","Khemissa","M'daourouche","Machroha","Merahna","Oued Kebrit","Ouled Driss","Ouled Moumen","Oum El Adhaim","Quillen","Ragouba","Safel El Ouiden","Sedrata","Sidi Fredj","Souk Ahras","Taoura","Terraguelt","Tiffech","Zaarouria","Zouabi"],
      "42":["Aghbal","Ahmer El Ain","Ain Tagourait","Attatba","Beni Mileuk","Bou Haroun","Bou Ismail","Bourkika","Chaiba","Cherchell","Damous","Douaouda","Fouka","Gouraya","Hadjout","Hadjret Ennous","Khemisti","Kolea","Larhat","Menaceur","Merad","Messelmoun","Nador","Sidi Amar","Sidi Ghiles","Sidi Rached","Sidi Semiane","Tipaza"],
      "43":["Ahmed Rachedi","Ain Beida Harriche","Ain Mellouk","Ain Tine","Amira Arres","Benyahia Abderrahmane","Bouhatem","Chelghoum Laid","Chigara","Derrahi Bousselah","El Mechira","Elayadi Barbes","Ferdjioua","Grarem Gouga","Hamala","Mila","Minar Zarza","Oued Athmenia","Oued Endja","Oued Seguen","Ouled Khalouf","Rouached","Sidi Khelifa","Sidi Merouane","Tadjenanet","Tassadane Haddada","Teleghma","Terrai Bainem","Tessala","Tiberguent","Yahia Beniguecha","Zeghaia"],
      "44":["Ain Benian","Ain Bouyahia","Ain Defla","Ain Lechiakh","Ain Soltane","Ain Tork","Arib","Barbouche","Bathia","Belaas","Ben Allal","Bir Ould Khelifa","Bordj Emir Khaled","Boumedfaa","Bourached","Djelida","Djemaa Ouled Cheikh","Djendel","El Abadia","El Amra","El Attaf","El Maine","Hammam Righa","Hassania","Hoceinia","Khemis Miliana","Mekhatria","Miliana","Oued Chorfa","Oued Djemaa","Rouina","Sidi Lakhdar","Tacheta Zegagha","Tarik Ibn Ziad","Tiberkanine","Zeddine"],
      "45":["Ain Ben Khelil","Ain Safra","Assela","Djeniane Bourzeg","El Biod","Kasdir","Makman Ben Amer","Mecheria","Moghrar","Naama","Sfissifa","Tiout"],
      "46":["Aghlal","Ain El Arbaa","Ain Kihal","Ain Temouchent","Ain Tolba","Aoubellil","Beni Saf","Bouzedjar","Chaabat El Ham","Chentouf","El Amria","El Malah","El Messaid","Emir Abdelkader","Hammam Bouhadjar","Hassasna","Hassi El Ghella","Oued Berkeche","Oued Sebbah","Ouled Boudjemaa","Ouled Kihal","Oulhaca El Gheraba","Sidi Ben Adda","Sidi Boumediene","Sidi Ouriache","Sidi Safi","Tamzoura","Terga"],
      "47":["Berriane","Bounoura","Dhayet Bendhahoua","El Atteuf","El Guerrara","Ghardaia","Mansoura","Metlili","Sebseb","Zelfana"],
      "48":["Ain Rahma","Ain Tarek","Ammi Moussa","Belaassel Bouzagza","Bendaoud","Beni Dergoun","Beni Zentis","Dar Ben Abdelah","Djidiouia","El Guettar","El H'madna","El Hassi","El Matmar","El Ouldja","Had Echkalla","Hamri","Kalaa","Lahlef","Mazouna","Mediouna","Mendes","Merdja Sidi Abed","Ouarizane","Oued El Djemaa","Oued Essalem","Oued Rhiou","Ouled Aiche","Ouled Sidi Mihoub","Ramka","Relizane","Sidi Khettab","Sidi Lazreg","Sidi M'hamed Benali","Sidi M'hamed Benaouda","Sidi Saada","Souk El Had","Yellel","Zemmoura"],
      "49":["Aougrout","Charouine","Deldoul","Ksar Kaddour","Metarfa","Ouled Aissa","Ouled Said","Talmine","Timimoun","Tinerkouk"],
      "50":["Bordj Badji Mokhtar","Timiaouine"],
      "51":["Besbes","Chaiba","Doucen","Ouled Djellal","Ras El Miad","Sidi Khaled"],
      "52":["Beni Abbes","Beni Ikhlef","El Ouata","Igli","Kerzaz","Ksabi","Ouled Khoudir","Tabelbala","Tamtert","Timoudi"],
      "53":["Foggaret Azzaouia","In Ghar","In Salah"],
      "54":["In Guezzam","Tin Zouatine"],
      "55":["Benaceur","Blidet Amor","El Alia","El Hadjira","Megarine","Mnaguer","Nezla","Sidi Slimane","Taibet","Tebesbest","Temacine","Touggourt","Zaouia El Abidia"],
      "56":["Bordj El Haouasse","Djanet"],
      "57":["Djamaa","El M'ghair","Mrara","Oum Touyour","Sidi Amrane","Sidi Khelil","Still","Tenedla"],
      "58":["El Meniaa","Hassi Fehal","Hassi Gara"]
    };

    const capitalsWithStopDesk = {
      "01":"Adrar","02":"Chlef","03":"Laghouat","04":"Oum El Bouaghi","05":"Batna","06":"Béjaïa",
      "07":"Biskra","08":"Béchar","09":"Blida","10":"Bouira","11":"Tamanrasset","12":"Tébessa",
      "13":"Tlemcen","14":"Tiaret","15":"Tizi Ouzou","16":"Alger","17":"Djelfa","18":"Jijel",
      "19":"Sétif","20":"Saïda","21":"Skikda","22":"Sidi Bel Abbès","23":"Annaba","24":"Guelma",
      "25":"Constantine","26":"Médéa","27":"Mostaganem","28":"M'Sila","29":"Mascara","30":"Ouargla",
      "31":"Oran","32":"El Bayadh","33":"Illizi","34":"Bordj Bou Arréridj","35":"Boumerdès",
      "36":"El Tarf","37":"Tindouf","38":"Tissemsilt","39":"El Oued","40":"Khenchela",
      "41":"Souk Ahras","42":"Tipaza","43":"Mila","44":"Aïn Defla","45":"Naâma",
      "46":"Aïn Témouchent","47":"Ghardaïa","48":"Relizane","49":"Timimoun",
      "50":"Bordj Badji Mokhtar","51":"Ouled Djellal","52":"Béni Abbès","53":"In Salah",
      "54":"In Guezzam","55":"Touggourt","56":"Djanet","57":"El M'ghair","58":"El Meniaa"
    };
    const expectedBaladiyaCount = Object.values(wilayaMunicipalities).reduce((sum, arr) => sum + arr.length, 0);

    // Check and create wilayas table
    const checkWilayasTable = await conn.execute("SHOW TABLES LIKE 'wilayas'");
    const hasWilayasTable = Array.isArray(checkWilayasTable) && checkWilayasTable.length > 0;
    if (!hasWilayasTable) {
      console.log('Creating wilayas table...');
      await conn.execute(`
        CREATE TABLE wilayas (
          code VARCHAR(10) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          home_delivery_price DECIMAL(10,2) DEFAULT 0,
          stopdesk_delivery_price DECIMAL(10,2) DEFAULT 0,
          free_delivery BOOLEAN DEFAULT 0,
          is_active BOOLEAN DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('  ✓ wilayas table created');

      const wilayaSeedData = [
        ["01","Adrar",1000,600,0,1],["02","Chlef",800,500,0,1],["03","Laghouat",900,550,0,1],
        ["04","Oum El Bouaghi",700,450,0,1],["05","Batna",700,450,0,1],["06","Béjaïa",600,400,0,1],
        ["07","Biskra",900,550,0,1],["08","Béchar",1000,600,0,1],["09","Blida",750,450,0,1],
        ["10","Bouira",600,400,0,1],["11","Tamanrasset",1100,700,0,1],["12","Tébessa",750,450,0,1],
        ["13","Tlemcen",800,500,0,1],["14","Tiaret",750,450,0,1],["15","Tizi Ouzou",700,450,0,1],
        ["16","Alger",600,400,0,1],["17","Djelfa",850,500,0,1],["18","Jijel",700,500,0,1],
        ["19","Sétif",500,400,0,1],["20","Saïda",900,550,0,1],["21","Skikda",700,450,0,1],
        ["22","Sidi Bel Abbès",800,500,0,1],["23","Annaba",700,450,0,1],["24","Guelma",700,450,0,1],
        ["25","Constantine",700,450,0,1],["26","Médéa",750,450,0,1],["27","Mostaganem",800,500,0,1],
        ["28","M'Sila",700,450,0,1],["29","Mascara",800,500,0,1],["30","Ouargla",1000,600,0,1],
        ["31","Oran",800,450,0,1],["32","El Bayadh",1000,600,0,1],["33","Illizi",1100,700,0,1],
        ["34","Bordj Bou Arréridj",600,400,0,1],["35","Boumerdès",700,450,0,1],["36","El Tarf",800,500,0,1],
        ["37","Tindouf",1100,700,0,1],["38","Tissemsilt",750,450,0,1],["39","El Oued",900,550,0,1],
        ["40","Khenchela",750,450,0,1],["41","Souk Ahras",750,450,0,1],["42","Tipaza",750,450,0,1],
        ["43","Mila",700,500,0,1],["44","Aïn Defla",750,450,0,1],["45","Naâma",1000,600,0,1],
        ["46","Aïn Témouchent",800,500,0,1],["47","Ghardaïa",1100,700,0,1],["48","Relizane",800,550,0,1],
        ["49","Timimoun",1100,700,0,1],["50","Bordj Badji Mokhtar",1100,700,0,1],["51","Ouled Djellal",900,550,0,1],
        ["52","Béni Abbès",1000,600,0,1],["53","In Salah",1100,700,0,1],["54","In Guezzam",1100,700,0,1],
        ["55","Touggourt",900,550,0,1],["56","Djanet",1100,700,0,1],["57","El M'ghair",900,550,0,1],
        ["58","El Meniaa",1100,700,0,1]
      ];
      for (const w of wilayaSeedData) {
        await conn.execute(
          'INSERT INTO wilayas (code, name, home_delivery_price, stopdesk_delivery_price, free_delivery, is_active) VALUES (?, ?, ?, ?, ?, ?)',
          w
        );
      }
      console.log('  ✓ 58 wilayas seeded');
    } else {
      console.log('  - wilayas table already exists, skipping');
    }

    // Check and create baladiyas table
    const checkBaladiyasTable = await conn.execute("SHOW TABLES LIKE 'baladiyas'");
    const hasBaladiyasTable = Array.isArray(checkBaladiyasTable) && checkBaladiyasTable.length > 0;
    if (hasBaladiyasTable) {
      const countResult = await conn.execute('SELECT COUNT(*) as cnt FROM baladiyas');
      const existingCount = countResult[0]?.cnt || 0;
      if (existingCount === expectedBaladiyaCount) {
        console.log('  - baladiyas table already exists with correct data, skipping');
      } else {
        console.log(`  - baladiyas table has ${existingCount} rows (expected ${expectedBaladiyaCount}), dropping and recreating...`);
        await conn.execute('DROP TABLE IF EXISTS baladiyas');
      }
    }
    const checkBaladiyasTableAfter = await conn.execute("SHOW TABLES LIKE 'baladiyas'");
    if (!(Array.isArray(checkBaladiyasTableAfter) && checkBaladiyasTableAfter.length > 0)) {
      console.log('Creating baladiyas table...');
      await conn.execute(`
        CREATE TABLE baladiyas (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          wilaya_code VARCHAR(10) NOT NULL,
          has_stopdesk BOOLEAN DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (wilaya_code) REFERENCES wilayas(code) ON DELETE CASCADE
        )
      `);
      console.log('  ✓ baladiyas table created');

      for (const [code, municipalities] of Object.entries(wilayaMunicipalities)) {
        const capitalName = capitalsWithStopDesk[code];
        for (const mun of municipalities) {
          await conn.execute(
            'INSERT INTO baladiyas (name, wilaya_code, has_stopdesk) VALUES (?, ?, ?)',
            [mun, code, mun === capitalName ? 1 : 0]
          );
        }
      }
      console.log('  ✓ baladiyas seeded');
    } else {
      console.log('  - baladiyas table already exists, skipping');
    }

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
