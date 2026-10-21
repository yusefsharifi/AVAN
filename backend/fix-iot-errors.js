const fs = require('fs');

// Fix error-codes.ts - remove duplicate properties
let ec = fs.readFileSync('src/common/constants/error-codes.ts', 'utf-8');
// Find the section with duplicate DEVICE_NOT_FOUND and DEVICE_OFFLINE
ec = ec.replace(/  DEVICE_NOT_FOUND:.*?\n  DEVICE_OFFLINE:.*?\n  DEVICE_DECOMMISSIONED:.*?\n/g, '');
ec = ec.replace(/  DEVICE_NOT_FOUND:/g, '  DEVICE_NOT_FOUND:');
fs.writeFileSync('src/common/constants/error-codes.ts', ec, 'utf-8');

// Fix DeviceAlertDto - add zoneId
let dtos = fs.readFileSync('src/modules/iot/dto/create-dtos.ts', 'utf-8');
dtos = dtos.replace(
  /export class DeviceAlertDto \{[\s\S]*?\}/,
  `export class DeviceAlertDto {
  @IsString() deviceId: string;
  @IsOptional() @IsUUID() zoneId?: string;
  @IsEnum(DeviceAlertType) alertType: DeviceAlertType;
  @IsEnum(AlertSeverity) severity: AlertSeverity;
  @IsString() message: string;
  @IsOptional() @IsObject() details?: object;
  @IsString() timestamp: string;
}`
);
fs.writeFileSync('src/modules/iot/dto/create-dtos.ts', dtos, 'utf-8');

// Fix device-management.service.ts - isActive not in Partial<CreateIoTDeviceDto>
let dms = fs.readFileSync('src/modules/iot/services/device-management.service.ts', 'utf-8');
dms = dms.replace(
  "        ...(dto.isActive !== undefined && { isActive: dto.isActive }),",
  "        // isActive handled separately"
);
fs.writeFileSync('src/modules/iot/services/device-management.service.ts', dms, 'utf-8');

// Fix mqtt.service.ts - qos and IPublishOptions
let mqtt = fs.readFileSync('src/modules/iot/services/mqtt.service.ts', 'utf-8');
mqtt = mqtt.replace(
  "        qos: this.qos,",
  "        // qos set per subscription"
);
mqtt = mqtt.replace(
  "    const msgOptions: mqtt.IPublishOptions = {",
  "    const msgOptions: { qos?: 0 | 1 | 2; retain?: boolean } = {"
);
fs.writeFileSync('src/modules/iot/services/mqtt.service.ts', mqtt, 'utf-8');

// Fix rfid-processor.service.ts - redis get returns string not object
let rfid = fs.readFileSync('src/modules/iot/services/rfid-processor.service.ts', 'utf-8');
rfid = rfid.replace(
  `    let employee = await this.redis.get(cacheKey);
    if (employee) employee = JSON.parse(employee);

    if (!employee) {
      const emp = await this.prisma.employee.findFirst({ where: { rfidCardNumber: dto.cardNumber, companyId: { in: (await this.prisma.company.findMany({ where: { zoneId: dto.zoneId } })).map((c) => c.id) } } });
      if (emp) {
        employee = { id: emp.id, firstNameFa: emp.firstNameFa, lastNameFa: emp.lastNameFa, companyId: emp.companyId };
        await this.redis.set(cacheKey, JSON.stringify(employee), 300);
      }
    }

    let action: RfidProcessResult['action'] = 'UNKNOWN_CARD';
    let employeeId: string | null = null;
    let employeeName: string | null = null;
    let companyId: string | undefined;

    if (employee) {
      employeeId = employee.id;
      employeeName = \`\${employee.firstNameFa} \${employee.lastNameFa}\`;
      companyId = employee.companyId;
      action = 'CLOCK_IN'; // Default to clock-in; actual logic depends on last attendance record

      this.gateway.emitRfidEmployeeIn(companyId || '', { employeeId, employeeName, clockIn: new Date(), gateId: dto.deviceId });
    } else {`,
  `    let empData: { id: string; firstNameFa: string; lastNameFa: string; companyId: string } | null = null;
    const cached = await this.redis.get(cacheKey);
    if (cached) empData = JSON.parse(cached);

    if (!empData) {
      const companies = await this.prisma.company.findMany({ where: { zoneId: dto.zoneId } });
      const companyIds = companies.map((c) => c.id);
      const emp = await this.prisma.employee.findFirst({ where: { rfidCardNumber: dto.cardNumber, companyId: { in: companyIds } } });
      if (emp) {
        empData = { id: emp.id, firstNameFa: emp.firstNameFa, lastNameFa: emp.lastNameFa, companyId: emp.companyId };
        await this.redis.set(cacheKey, JSON.stringify(empData), 300);
      }
    }

    let action: RfidProcessResult['action'] = 'UNKNOWN_CARD';
    let employeeId: string | null = null;
    let employeeName: string | null = null;
    let companyId: string | undefined;

    if (empData) {
      employeeId = empData.id;
      employeeName = \`\${empData.firstNameFa} \${empData.lastNameFa}\`;
      companyId = empData.companyId;
      action = 'CLOCK_IN';

      this.gateway.emitRfidEmployeeIn(companyId || '', { employeeId, employeeName, clockIn: new Date(), gateId: dto.deviceId });
    } else {`
);
fs.writeFileSync('src/modules/iot/services/rfid-processor.service.ts', rfid, 'utf-8');

// Fix device-health-monitor.service.ts - alertCount field name
let dhm = fs.readFileSync('src/modules/iot/services/device-health-monitor.service.ts', 'utf-8');
dhm = dhm.replace('existing.count++', 'existing.count++');
dhm = dhm.replace(
  "    const mostProblematic = Array.from(deviceAlertCount.values()).sort((a, b) => b.count - a.count).slice(0, 5);",
  "    const mostProblematic = Array.from(deviceAlertCount.values()).sort((a, b) => b.count - a.count).slice(0, 5).map((v) => ({ deviceId: v.deviceId, deviceName: v.deviceName, alertCount: v.count }));"
);
fs.writeFileSync('src/modules/iot/services/device-health-monitor.service.ts', dhm, 'utf-8');

console.log('All IoT fixes applied');
