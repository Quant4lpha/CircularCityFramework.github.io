// Initialize dropdowns and canvas when the document loads
document.addEventListener('DOMContentLoaded', () => {
    initializeDropdowns();
    initializeCanvas();
    setupEventListeners();
});

// Populate all dropdowns with values 0-10
function initializeDropdowns() {
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        for (let i = 0; i <= 10; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            select.appendChild(option);
        }
        select.value = 0; // Set default value
    });
}

// Canvas setup and drawing functions
let canvas, ctx;
// Define variable colors with 50% opacity based on their groups
const VARIABLE_COLORS = [
    'rgba(126, 217, 87, 0.5)',   // Environmental (1-4)
    'rgba(126, 217, 87, 0.5)',
    'rgba(126, 217, 87, 0.5)',
    'rgba(126, 217, 87, 0.5)',
    'rgba(255, 222, 89, 0.5)',   // Social (5-7)
    'rgba(255, 222, 89, 0.5)',
    'rgba(255, 222, 89, 0.5)',
    'rgba(203, 108, 230, 0.5)',  // Governance (8)
    'rgba(56, 182, 255, 0.5)',   // Resource Management (9-10)
    'rgba(56, 182, 255, 0.5)',
    'rgba(253, 112, 112, 0.5)'   // Financial Circularity (11)
];

const VARIABLES = [
    'Air Quality', 'Waste & Energy', 'Green Space', 'Greenhouse Gas Emissions',
    'Human Development', 'Quality of Life', 'Social Progress',
    'Transparency', 'Resource Reuse', 'Water Management', 'Bond Credit'
];

// Define groups and their properties
const GROUPS = [
    {
        name: 'Environmental',
        color: '#7ed957',
        startIndex: 0,
        endIndex: 3,
        fontSize: '32px',
        spacingMultiplier: 0.88
    },
    {
        name: 'Social',
        color: '#ffde59',
        startIndex: 4,
        endIndex: 6,
        fontSize: '32px',
        spacingMultiplier: 0.88
    },
    {
        name: 'Governance',
        color: '#cb6ce6',
        startIndex: 7,
        endIndex: 7,
        fontSize: '32px',
        spacingMultiplier: 1.8
    },
    {
        name: 'Management\nResource',
        color: '#38b6ff',
        startIndex: 8,
        endIndex: 9,
        fontSize: '24px',
        spacingMultiplier: 1.43,
        lineSpacingMultiplier: 2.0
    },
    {
        name: 'Circularity\nFinancial',
        color: '#fd7070',
        startIndex: 10,
        endIndex: 10,
        fontSize: '24px',
        spacingMultiplier: 1.43,
        lineSpacingMultiplier: 2.0
    }
];

function initializeCanvas() {
    canvas = document.getElementById('chartCanvas');
    ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', () => {
        resizeCanvas();
        drawChart();
    });
    
    drawChart();
}

function setupEventListeners() {
    document.querySelectorAll('select').forEach(select => {
        select.addEventListener('change', drawChart);
    });
    
    document.getElementById('chartTitle').addEventListener('input', drawChart);
    document.getElementById('chartSubtitle').addEventListener('input', drawChart);

    // Save and Load functionality
    document.getElementById('saveBtn').addEventListener('click', saveChartData);
    document.getElementById('loadBtn').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    document.getElementById('fileInput').addEventListener('change', loadChartData);

    // Add mouse hover functionality
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseout', () => {
        drawChart(); // Redraw chart without hover value
    });
    canvas.addEventListener('mouseleave', () => {
        drawChart(); // Ensure chart is redrawn when mouse leaves
    });
    
    // Hide hover text on right click but allow context menu
    canvas.addEventListener('contextmenu', () => {
        drawChart(); // Redraw without hover text
    });
    
    // Add click interaction to fill arcs
    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Calculate distance and angle from center
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx);
        if (angle < 0) angle += 2 * Math.PI;
        
        // Adjust angle to match chart's starting position (-PI/2)
        angle = (angle + Math.PI/2) % (2 * Math.PI);
        
        const maxRadius = Math.min(canvas.width, canvas.height) * 0.4;
        const stepSize = maxRadius / 10;
        const angleStep = (2 * Math.PI) / VARIABLES.length;
        
        // Calculate which sector and arc was clicked
        const sector = Math.floor(angle / angleStep);
        const arc = Math.floor(distance / stepSize);
        
        // Update dropdown if click was within valid area
        if (sector >= 0 && sector < VARIABLES.length && arc >= 0 && arc < 10) {
            const dropdown = document.getElementById(`var${sector + 1}`);
            dropdown.value = (arc + 1).toString();
            drawChart();
        }
    });
}

async function saveChartData() {
    try {
        // Collect all values
        const data = {
            title: document.getElementById('chartTitle').value,
            subtitle: document.getElementById('chartSubtitle').value,
            variables: {}
        };
        
        // Get all variable values
        for (let i = 1; i <= VARIABLES.length; i++) {
            data.variables[`var${i}`] = document.getElementById(`var${i}`).value;
        }
        
        // Create file content
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        
        // Show save dialog
        const handle = await window.showSaveFilePicker({
            suggestedName: 'chart-data.json',
            types: [{
                description: 'JSON Files',
                accept: {
                    'application/json': ['.json']
                }
            }]
        });
        
        // Write the file
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Error saving file:', err);
            alert('Error saving file. Please try again.');
        }
    }
}

function loadChartData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Set title and subtitle
            if (data.title) document.getElementById('chartTitle').value = data.title;
            if (data.subtitle) document.getElementById('chartSubtitle').value = data.subtitle;
            
            // Set variable values
            for (let i = 1; i <= VARIABLES.length; i++) {
                const value = data.variables[`var${i}`];
                if (value !== undefined) {
                    document.getElementById(`var${i}`).value = value;
                }
            }
            
            // Redraw chart with new values
            drawChart();
            
            // Reset file input
            event.target.value = '';
        } catch (error) {
            console.error('Error loading chart data:', error);
            alert('Error loading chart data. Please make sure the file is valid.');
        }
    };
    reader.readAsText(file);
}

function handleMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Calculate distance from center and angle
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += 2 * Math.PI;
    
    // Adjust angle to match our chart's starting position (-PI/2)
    angle = (angle + Math.PI/2) % (2 * Math.PI);
    
    const maxRadius = Math.min(canvas.width, canvas.height) * 0.4;
    const stepSize = maxRadius / 10;
    const angleStep = (2 * Math.PI) / VARIABLES.length;
    
    // Calculate which sector (variable) we're in
    const sector = Math.floor(angle / angleStep);
    
    // Calculate which arc (value) we're over
    const arc = Math.floor(distance / stepSize);
    
    const maxArcRadius = Math.min(canvas.width, canvas.height) * 0.4;
    
    // Always redraw base chart
    drawChart();

    // Show value if we're within valid area
    if (sector >= 0 && sector < VARIABLES.length && arc >= 0 && arc < 10 && distance <= maxArcRadius) {
        // Draw value next to cursor
        ctx.save();
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        // Add white background to text
        const text = (arc + 1).toString(); // arc starts at 0, display starts at 1
        const metrics = ctx.measureText(text);
        const padding = 4;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(
            x + 10 - padding,
            y - padding,
            metrics.width + padding * 2,
            parseInt(ctx.font) + padding * 2
        );
        
        // Draw text
        ctx.fillStyle = 'black';
        ctx.fillText(text, x + 10, y);
        ctx.restore();
    }
}

// Function to get group color for a variable index
function getGroupColor(variableIndex) {
    for (const group of GROUPS) {
        if (variableIndex >= group.startIndex && variableIndex <= group.endIndex) {
            return group.color;
        }
    }
    return '#000000';
}

// Function to convert hex color to rgba
function hexToRgba(hex, opacity) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Function to draw curved background
function drawCurvedBackground(centerX, centerY, radius, startAngle, endAngle, color) {
    const innerRadius = radius - 10;
    const outerRadius = radius + 10;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
    ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
    ctx.closePath();
    
    ctx.fillStyle = color;
    ctx.fill();
}

// Function to draw curved text
function drawCurvedText(text, centerX, centerY, radius, startAngle, endAngle, fixedAngleStep, options = {}) {
    const lines = text.split('\n');
    const fontSize = parseInt(options.fontSize || '16px');
    const lineSpacing = fontSize * (options.lineSpacingMultiplier || 1.2);
    
    lines.forEach((line, index) => {
        const textLength = line.length;
        const pixelToAngle = (2 * Math.PI) / (2 * Math.PI * radius);
        const marginAngle = 2 * pixelToAngle;
        
        const totalTextAngle = fixedAngleStep * (textLength - 1);
        const startDrawAngle = startAngle + marginAngle + ((endAngle - startAngle - totalTextAngle - 2 * marginAngle) / 2);
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = options.color || 'black';
        
        if (options.bold) {
            ctx.font = `bold ${options.fontSize || '16px'} Arial`;
        }
        
        const lineRadius = radius + (index * lineSpacing / 2);
        
        for (let i = 0; i < textLength; i++) {
            const currentAngle = startDrawAngle + (fixedAngleStep * i);
            const x = centerX + Math.cos(currentAngle) * lineRadius;
            const y = centerY + Math.sin(currentAngle) * lineRadius;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(currentAngle + Math.PI/2);
            
            if (options.stroke) {
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 3;
                ctx.strokeText(line[i], 0, 0);
            }
            
            ctx.fillText(line[i], 0, 0);
            ctx.restore();
        }
    });
}

// Calculate fixed character spacing for all labels
function calculateFixedCharacterSpacing(radius, sectorAngle, spacingMultiplier = 0.8) {
    const maxLength = Math.max(...VARIABLES.map(text => text.length));
    const pixelToAngle = (2 * Math.PI) / (2 * Math.PI * radius);
    const marginAngle = 2 * pixelToAngle;
    const availableAngle = sectorAngle - (2 * marginAngle);
    return (availableAngle * spacingMultiplier) / maxLength;
}

function drawChart() {
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    ctx.clearRect(0, 0, width, height);
    
    const maxRadius = Math.min(width, height) * 0.4;
    const stepSize = maxRadius / 10;
    const angleStep = (Math.PI * 2) / VARIABLES.length;
    
    // Draw concentric circles
    for (let i = 1; i <= 10; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, i * stepSize, 0, Math.PI * 2);
        ctx.strokeStyle = i === 10 ? 'black' : '#cccccc';
        ctx.stroke();
    }
    
    // Draw radiating lines and filled arcs
    for (let i = 0; i < VARIABLES.length; i++) {
        const startAngle = (i * angleStep) - Math.PI / 2;
        const endAngle = ((i + 1) * angleStep) - Math.PI / 2;
        
        // Draw radiating line
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
            centerX + Math.cos(startAngle) * (maxRadius + 20),
            centerY + Math.sin(startAngle) * (maxRadius + 20)
        );
        ctx.strokeStyle = '#999999';
        ctx.stroke();
        
        // Draw filled arcs for the value
        const value = parseInt(document.getElementById(`var${i+1}`).value) || 0;
        const color = getGroupColor(i);
        
        for (let j = 0; j < value; j++) {
            const innerRadius = j * stepSize;
            const outerRadius = (j + 1) * stepSize;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
            ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
            ctx.closePath();
            ctx.fillStyle = hexToRgba(color, 0.4);
            ctx.fill();
        }
    }
    
    // Draw last radiating line to complete the circle
    const lastAngle = (Math.PI * 2) - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
        centerX + Math.cos(lastAngle) * (maxRadius + 20),
        centerY + Math.sin(lastAngle) * (maxRadius + 20)
    );
    ctx.strokeStyle = '#999999';
    ctx.stroke();
    
    // Draw scale labels
    ctx.font = 'bold 14px Arial';
    for (let j = 1; j <= 10; j++) {
        const radius = j * stepSize;
        const x = centerX + Math.cos(-Math.PI/2) * radius;
        const y = centerY + Math.sin(-Math.PI/2) * radius;
        
        ctx.fillStyle = 'rgba(238, 238, 238, 0.5)';
        const textWidth = ctx.measureText(j.toString()).width;
        ctx.fillRect(x - textWidth/2 - 2, y - 8, textWidth + 4, 16);
        
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(j.toString(), x, y);
    }
    
    // Draw backgrounds for variable labels
    const labelRadius = maxRadius + 25;
    for (let i = 0; i < VARIABLES.length; i++) {
        const startAngle = (i * angleStep) - Math.PI / 2;
        const endAngle = ((i + 1) * angleStep) - Math.PI / 2;
        
        drawCurvedBackground(
            centerX,
            centerY,
            labelRadius,
            startAngle,
            endAngle,
            VARIABLE_COLORS[i]
        );
    }

    // Draw variable labels
    const groupLabelRadius = labelRadius + 45;
    const fixedCharSpacing = calculateFixedCharacterSpacing(labelRadius, angleStep, 1.0);
    
    ctx.font = '16px Arial';
    for (let i = 0; i < VARIABLES.length; i++) {
        const startAngle = (i * angleStep) - Math.PI / 2;
        const endAngle = ((i + 1) * angleStep) - Math.PI / 2;
        
        drawCurvedText(
            VARIABLES[i],
            centerX,
            centerY,
            labelRadius,
            startAngle,
            endAngle,
            fixedCharSpacing,
            { stroke: true }
        );
    }
    
    // Draw group labels
    for (const group of GROUPS) {
        const startAngle = (group.startIndex * angleStep) - Math.PI / 2;
        const endAngle = ((group.endIndex + 1) * angleStep) - Math.PI / 2;
        const groupCharSpacing = calculateFixedCharacterSpacing(
            groupLabelRadius,
            angleStep * (group.endIndex - group.startIndex + 1),
            group.spacingMultiplier
        );
        
        drawCurvedText(
            group.name,
            centerX,
            centerY,
            groupLabelRadius,
            startAngle,
            endAngle,
            groupCharSpacing,
            {
                color: group.color,
                bold: true,
                fontSize: group.fontSize,
                lineSpacingMultiplier: group.lineSpacingMultiplier
            }
        );
    }
    
    // Draw titles and total score
    const title = document.getElementById('chartTitle').value;
    const subtitle = document.getElementById('chartSubtitle').value;
    
    // Calculate total score
    let totalScore = 0;
    for (let i = 1; i <= VARIABLES.length; i++) {
        totalScore += parseInt(document.getElementById(`var${i}`).value) || 0;
    }
    
    if (title) {
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(title, centerX, 20);
    }
    
    if (subtitle) {
        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(subtitle, centerX, 65);
    }
    
    // Draw total score
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`Total Score: ${totalScore}`, centerX, 120);
}
