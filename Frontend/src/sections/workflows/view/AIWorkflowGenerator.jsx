import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Paper,
  Divider,
} from '@mui/material';
import { AutoAwesome, Psychology, Speed } from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';

const AIWorkflowGenerator = ({ onWorkflowGenerated, onClose, onGenerationStart }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [lastGenerated, setLastGenerated] = useState(null);

  // Sample prompts for quick testing
  const samplePrompts = [
    'Create a leave approval workflow with HR and manager routing',
    'Build an expense approval process for different amounts',
    'Design a document review workflow with multiple approvers',
    'Make a simple task assignment workflow',
  ];

  // 🚀 Hybrid AI + Smart Template Generator
  const generateWorkflowWithAI = async (userPrompt) => {
    if (!userPrompt?.trim()) {
      setError('Please enter a workflow description');
      return null;
    }

    setIsGenerating(true);
    setError('');

    try {
      console.log('🎯 Generating workflow for:', userPrompt);

      // COMMENTED OUT: AI generation temporarily disabled
      // console.log('🤖 Attempting AI generation...');
      // const aiResult = await tryAIGeneration(userPrompt);
      // 
      // if (aiResult) {
      //   console.log('✅ AI generated workflow successfully:', aiResult.workflowName);
      //   setIsGenerating(false);
      //   return aiResult;
      // }
      
      // COMMENTED OUT: Smart template generation also disabled
      // console.log('🧠 Using smart template system');
      // const templateResult = generateSmartTemplate(userPrompt);
      // 
      // if (templateResult) {
      //   console.log('✅ Generated smart template workflow:', templateResult.workflowName);
      //   setIsGenerating(false);
      //   return templateResult;
      // }
      
      // Show message about unlocking workflow generation
      setError('💡 Save details to unlock AI workflow generation');
      setIsGenerating(false);
      return null;
      
    } catch (generationError) {
      console.error('Generation error:', generationError);
      setError(`Generation failed: ${generationError.message}`);
      setIsGenerating(false);
      return null;
    }
  };

  // 🎯 Create Simple Working Workflows
  const createSimpleWorkingWorkflow = (userPrompt) => {
    const startId = uuidv4();
    const actionId = uuidv4();
    const decisionId = uuidv4();
    const approveId = uuidv4();
    const rejectId = uuidv4();
    const endId = uuidv4();

    // Analyze the prompt for workflow type
    const lower = userPrompt.toLowerCase();
    let workflowName = 'Custom Workflow';
    let actionLabel = 'Process Request';
    let decisionLabel = 'Approve?';
    let approveLabel = 'Approved Action';
    let rejectLabel = 'Rejected Action';

    if (lower.includes('support') || lower.includes('ticket')) {
      workflowName = 'Support Ticket Workflow';
      actionLabel = 'Analyze Ticket';
      decisionLabel = 'Can Resolve?';
      approveLabel = 'Resolve Ticket';
      rejectLabel = 'Escalate to Senior';
    } else if (lower.includes('approval') || lower.includes('review')) {
      workflowName = 'Approval Workflow';
      actionLabel = 'Review Request';
      decisionLabel = 'Approve Request?';
      approveLabel = 'Process Approval';
      rejectLabel = 'Send Rejection';
    } else if (lower.includes('hr') || lower.includes('employee')) {
      workflowName = 'HR Process Workflow';
      actionLabel = 'HR Review';
      decisionLabel = 'Meets Criteria?';
      approveLabel = 'Process Employee';
      rejectLabel = 'Send Rejection';
    } else {
      // Extract key words from prompt for customization
      const words = userPrompt.split(' ').filter(w => w.length > 3);
      if (words.length > 0) {
        workflowName = `${words[0].charAt(0).toUpperCase() + words[0].slice(1)} Workflow`;
      }
    }

    return {
      workflowName,
      nodes: [
        { id: startId, type: 'start', position: { x: 50, y: 200 }, label: 'Start' },
        { id: actionId, type: 'action', position: { x: 250, y: 200 }, label: actionLabel },
        { id: decisionId, type: 'decision', position: { x: 450, y: 200 }, label: decisionLabel },
        { id: approveId, type: 'action', position: { x: 650, y: 150 }, label: approveLabel },
        { id: rejectId, type: 'action', position: { x: 650, y: 250 }, label: rejectLabel },
        { id: endId, type: 'end', position: { x: 850, y: 200 }, label: 'End' }
      ],
      edges: [
        { source: startId, target: actionId, label: 'forward' },
        { source: actionId, target: decisionId, label: 'forward' },
        { source: decisionId, target: approveId, label: 'Yes' },
        { source: decisionId, target: rejectId, label: 'No' },
        { source: approveId, target: endId, label: 'forward' },
        { source: rejectId, target: endId, label: 'forward' }
      ]
    };
  };

  // 🤖 COMMENTED OUT: Real AI Generation with Multiple Model Fallbacks
  /*
  const tryAIGeneration = async (userPrompt) => {
    const models = ['llama3:8b', 'llama3', 'codellama', 'tinyllama'];
    
    // Enhanced AI prompt for better workflow generation
    const createEnhancedAIPrompt = (userInput) => 
      `You are a workflow design expert. Generate a complete business workflow in JSON format for: "${userInput}"

IMPORTANT: Return ONLY valid JSON, no explanations or markdown.

Required JSON structure:
{
  "workflowName": "Clear descriptive name for the workflow",
  "nodes": [
    {"id": "node1", "type": "start", "position": {"x": 50, "y": 200}, "label": "Start"},
    {"id": "node2", "type": "action", "position": {"x": 250, "y": 200}, "label": "Action description"},
    {"id": "node3", "type": "decision", "position": {"x": 450, "y": 200}, "label": "Decision question?"},
    {"id": "node4", "type": "action", "position": {"x": 650, "y": 150}, "label": "Action if yes"},
    {"id": "node5", "type": "action", "position": {"x": 650, "y": 250}, "label": "Action if no"},
    {"id": "node6", "type": "end", "position": {"x": 850, "y": 200}, "label": "End"}
  ],
  "edges": [
    {"source": "node1", "target": "node2", "label": "forward"},
    {"source": "node2", "target": "node3", "label": "forward"},
    {"source": "node3", "target": "node4", "label": "Yes"},
    {"source": "node3", "target": "node5", "label": "No"},
    {"source": "node4", "target": "node6", "label": "forward"},
    {"source": "node5", "target": "node6", "label": "forward"}
  ]
}

STRICT RULES:
1. First node MUST be type:"start"
2. Last node MUST be type:"end"
3. Use type:"action" for tasks/processes
4. Use type:"decision" for yes/no questions
5. NEVER connect action→action directly
6. NEVER connect decision→decision directly
7. ALL paths must eventually reach the end node
8. Use unique IDs for each node
9. Position nodes left-to-right: x values 50, 250, 450, 650, 850
10. Generate 5-8 nodes total`;
    
    // Using reduce for sequential model attempts instead of for-of loop
    const tryNextModel = async (modelIndex) => {
      if (modelIndex >= models.length) {
        console.log('🚫 All AI models exhausted, using template fallback');
        return null; // All AI models failed
      }
      
      const model = models[modelIndex];
      
      try {
        console.log(`🤖 Attempting AI generation with: ${model}`);
        
        const response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(20000), // Increased timeout to 20 seconds
          body: JSON.stringify({
            model,
            prompt: createEnhancedAIPrompt(userPrompt),
            stream: false,
            options: {
              temperature: 0.1, // Lower temperature for more structured output
              top_p: 0.8,
              num_predict: 1500,
              stop: ['\n\n', '```', 'Note:', 'Explanation:']
            }
          })
        });

        if (!response.ok) {
          console.warn(`❌ ${model} HTTP error: ${response.status}`);
          return tryNextModel(modelIndex + 1);
        }

        const data = await response.json();
        const responsePreview = data.response ? `${data.response.substring(0, 200)}...` : 'No response';
        console.log(`📝 Raw AI response from ${model}:`, responsePreview);
        
        // Enhanced JSON parsing
        const cleanResponse = data.response
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .replace(/^\s*[\w\s]*?({.*})[\w\s]*$/s, '$1') // Extract JSON from text
          .trim();
        
        try {
          const aiWorkflow = JSON.parse(cleanResponse);
          
          // Enhanced validation
          if (validateAIWorkflow(aiWorkflow)) {
            console.log(`✅ ${model} successfully generated: "${aiWorkflow.workflowName}"`);
            return aiWorkflow;
          }
          
          console.warn(`❌ ${model} generated invalid structure`);
          return tryNextModel(modelIndex + 1);
          
        } catch (parseError) {
          console.warn(`❌ ${model} JSON parse error:`, parseError.message);
          console.log('Raw response:', cleanResponse.substring(0, 300));
          return tryNextModel(modelIndex + 1);
        }
        
      } catch (modelError) {
        console.warn(`❌ ${model} request failed:`, modelError.message);
        return tryNextModel(modelIndex + 1); // Try next model
      }
    };

    return tryNextModel(0);
  };
  */

  // 🔍 COMMENTED OUT: Enhanced AI Workflow Validation
  /*
  const validateAIWorkflow = (workflow) => {
    try {
      // Check basic structure
      if (!workflow || !workflow.nodes || !workflow.edges || !workflow.workflowName) {
        console.warn('❌ Missing required workflow properties');
        return false;
      }

      const { nodes, edges } = workflow;
      
      // Check nodes
      if (!Array.isArray(nodes) || nodes.length < 3) {
        console.warn('❌ Invalid nodes array');
        return false;
      }

      // Validate node structure
      const nodeIds = new Set();
      let hasStart = false;
      let hasEnd = false;

      // eslint-disable-next-line no-restricted-syntax
      for (const node of nodes) {
        if (!node.id || !node.type || !node.label || !node.position) {
          console.warn('❌ Invalid node structure:', node);
          return false;
        }
        
        if (nodeIds.has(node.id)) {
          console.warn('❌ Duplicate node ID:', node.id);
          return false;
        }
        
        nodeIds.add(node.id);
        
        if (node.type === 'start') hasStart = true;
        if (node.type === 'end') hasEnd = true;
      }

      if (!hasStart || !hasEnd) {
        console.warn('❌ Missing start or end node');
        return false;
      }

      // Check edges
      if (!Array.isArray(edges) || edges.length < 2) {
        console.warn('❌ Invalid edges array');
        return false;
      }

      // Validate edge connections
      // eslint-disable-next-line no-restricted-syntax
      for (const edge of edges) {
        if (!edge.source || !edge.target || !edge.label) {
          console.warn('❌ Invalid edge structure:', edge);
          return false;
        }
        
        if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
          console.warn('❌ Edge references non-existent node:', edge);
          return false;
        }
      }

      console.log('✅ AI workflow validation passed');
      return true;
      
    } catch (validationError) {
      console.warn('❌ Validation error:', validationError.message);
      return false;
    }
  };
  */

  // 📝 COMMENTED OUT: Create Detailed AI Prompt
  /*
  const createDetailedAIPrompt = (userPrompt) => 
    `You are a workflow design expert. Create a JSON workflow structure for: "${userPrompt}"

REQUIREMENTS:
1. Return ONLY valid JSON, no explanations or markdown
2. Structure: {workflowName: "...", nodes: [...], edges: [...]}
3. Nodes: [{id: "unique-id", type: "start|action|decision|end", position: {x: 100, y: 200}, label: "descriptive name"}]
4. Edges: [{source: "source-node-id", target: "target-node-id", label: "connection description"}]
5. Use UUIDs for node IDs
6. Position nodes left-to-right with 200px spacing
7. Include at least 1 start node, 1 end node, and 2-5 process nodes
8. Make it professional and business-appropriate
9. Include decision points for complex workflows
10. Use clear, actionable labels

EXAMPLE FORMAT:
{
  workflowName: "Employee Onboarding Process",
  nodes: [{id: "start-123", type: "start", position: {x: 50, y: 200}, label: "New Employee"}],
  edges: [{source: "start-123", target: "process-456", label: "forward"}]
}

Generate workflow JSON for: "${userPrompt}"`;

  // 🧠 Parse AI Response and Clean JSON
  const parseAIResponse = (response, userPrompt) => {
    try {
      // Extract JSON from AI response
      const jsonString = response.trim()
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .replace(/^[^{]*\{/, '{')
        .replace(/\}[^}]*$/, '}');

      const workflow = JSON.parse(jsonString);
      
      // Ensure all nodes have proper IDs
      if (workflow.nodes) {
        workflow.nodes = workflow.nodes.map(node => ({
          ...node,
          id: node.id || uuidv4()
        }));
      }
      
      // Add default workflow name if missing
      if (!workflow.workflowName) {
        workflow.workflowName = userPrompt.charAt(0).toUpperCase() + userPrompt.slice(1).substring(0, 50);
      }
      
      return workflow;
    } catch (parseError) {
      console.warn('Failed to parse AI response:', parseError.message);
      return null;
    }
  };

  // ✅ Validate Workflow Structure
  const validateWorkflowStructure = (workflow) => {
    if (!workflow || !workflow.nodes || !workflow.edges) {
      return false;
    }
    
    const hasStart = workflow.nodes.some(node => node.type === 'start');
    const hasEnd = workflow.nodes.some(node => node.type === 'end');
    const hasValidEdges = workflow.edges.every(edge => edge.source && edge.target);
    
    return hasStart && hasEnd && hasValidEdges;
  };
  */

  // 🧠 COMMENTED OUT: Smart Template Analysis - All template generation disabled
  /*
  const generateSmartTemplate = (userPrompt) => {
    const analysis = analyzeWorkflowPrompt(userPrompt);
    console.log('📊 Workflow Analysis:', analysis);
    
    // Generate based on intelligent analysis
    if (analysis.isSupport) return generateAdvancedSupportWorkflow(analysis, userPrompt);
    if (analysis.isApproval) return generateApprovalWorkflow(analysis, userPrompt);
    if (analysis.isHR) return generateHRWorkflow(analysis, userPrompt);
    if (analysis.isFinance) return generateFinanceWorkflow(analysis, userPrompt);
    
    // Dynamic workflow generation
    return generateDynamicWorkflow(analysis, userPrompt);
  };

  // 🔍 Analyze Workflow Prompt
  const analyzeWorkflowPrompt = (workflowPrompt) => {
    const lower = workflowPrompt.toLowerCase();
    
    return {
      isSupport: /support|ticket|customer|help|issue/.test(lower),
      isApproval: /approv|review|authorize|sign.?off/.test(lower),
      isHR: /hr|human.?resource|employee|hire|leave|vacation/.test(lower),
      isFinance: /financ|expense|budget|cost|payment|reimburse/.test(lower),
      hasDecisions: /decision|choose|if|whether|approve|reject/.test(lower),
      actors: workflowPrompt.match(/\b(manager|supervisor|hr|admin|lead|director|ceo|cfo)\b/gi) || [],
      processes: workflowPrompt.match(/\b(submit|review|approve|process|route|escalate)\b/gi) || [],
    };
  };

  // 🎯 Advanced Support Workflow Generator
  const generateAdvancedSupportWorkflow = (analysis, workflowPrompt) => {
    const startId = uuidv4();
    const submitId = uuidv4();
    const categorizeId = uuidv4(); 
    const assignId = uuidv4();
    const resolvedId = uuidv4();
    const escalateId = uuidv4();
    const endId = uuidv4();

    return {
      workflowName: 'Customer Support Ticket Escalation System',
      nodes: [
        { id: startId, type: 'start', position: { x: 50, y: 200 }, label: 'Start' },
        { id: submitId, type: 'action', position: { x: 200, y: 200 }, label: 'Customer Submits Ticket' },
        { id: categorizeId, type: 'decision', position: { x: 400, y: 200 }, label: 'Priority Level?' },
        { id: assignId, type: 'action', position: { x: 600, y: 200 }, label: 'Assign to Support Team' },
        { id: resolvedId, type: 'decision', position: { x: 800, y: 200 }, label: 'Issue Resolved?' },
        { id: escalateId, type: 'action', position: { x: 1000, y: 300 }, label: 'Escalate to Senior Support' },
        { id: endId, type: 'end', position: { x: 1200, y: 200 }, label: 'End' }
      ],
      edges: [
        { source: startId, target: submitId, label: 'forward' },
        { source: submitId, target: categorizeId, label: 'forward' },
        { source: categorizeId, target: assignId, label: 'Low/Medium/High' },
        { source: assignId, target: resolvedId, label: 'forward' },
        { source: resolvedId, target: endId, label: 'Yes' },
        { source: resolvedId, target: escalateId, label: 'No' },
        { source: escalateId, target: endId, label: 'forward' }
      ]
    };
  };

  // 📋 Smart Approval Workflow Generator  
  const generateApprovalWorkflow = (analysis, workflowPrompt) => {
    const lower = workflowPrompt.toLowerCase();
    const hasAmount = /amount|cost|expense|\$/.test(lower);
    const hasHR = /hr|human|resource/.test(lower);
    const hasManager = /manager|supervisor|lead/.test(lower);
    
    if (hasAmount) {
      return generateAmountBasedApproval(analysis, workflowPrompt);
    }
    if (hasHR && hasManager) {
      return generateMultiLevelApproval(analysis, workflowPrompt);
    }
    
    return generateBasicApproval(analysis, workflowPrompt);
  };

  const generateAmountBasedApproval = (analysis, workflowPrompt) => {
    const nodeIds = Array(6).fill(0).map(() => uuidv4());
    return {
      workflowName: 'Amount-Based Approval Workflow',
      nodes: [
        { id: nodeIds[0], type: 'start', position: { x: 50, y: 200 }, label: 'Submit Request' },
        { id: nodeIds[1], type: 'decision', position: { x: 250, y: 200 }, label: 'Check Amount' },
        { id: nodeIds[2], type: 'action', position: { x: 450, y: 100 }, label: 'Manager Approval' },
        { id: nodeIds[3], type: 'action', position: { x: 450, y: 200 }, label: 'Department Head Approval' },
        { id: nodeIds[4], type: 'action', position: { x: 450, y: 300 }, label: 'Executive Approval' },
        { id: nodeIds[5], type: 'end', position: { x: 650, y: 200 }, label: 'Processed' }
      ],
      edges: [
        { source: nodeIds[0], target: nodeIds[1], label: 'forward' },
        { source: nodeIds[1], target: nodeIds[2], label: 'Under $1000' },
        { source: nodeIds[1], target: nodeIds[3], label: '$1000-$10000' },
        { source: nodeIds[1], target: nodeIds[4], label: 'Over $10000' },
        { source: nodeIds[2], target: nodeIds[5], label: 'forward' },
        { source: nodeIds[3], target: nodeIds[5], label: 'forward' },
        { source: nodeIds[4], target: nodeIds[5], label: 'forward' }
      ]
    };
  };

  // Helper functions for multi-level approval
  const generateMultiLevelApproval = (analysis, workflowPrompt) => {
    const nodeIds = Array(7).fill(0).map(() => uuidv4());
    return {
      workflowName: 'Multi-Level Approval Process',
      nodes: [
        { id: nodeIds[0], type: 'start', position: { x: 50, y: 200 }, label: 'Submit Request' },
        { id: nodeIds[1], type: 'action', position: { x: 250, y: 200 }, label: 'Initial Review' },
        { id: nodeIds[2], type: 'decision', position: { x: 450, y: 200 }, label: 'Manager Approval' },
        { id: nodeIds[3], type: 'decision', position: { x: 650, y: 100 }, label: 'HR Approval' },
        { id: nodeIds[4], type: 'action', position: { x: 850, y: 100 }, label: 'Approved & Process' },
        { id: nodeIds[5], type: 'action', position: { x: 650, y: 300 }, label: 'Rejected - Notify' },
        { id: nodeIds[6], type: 'end', position: { x: 1050, y: 200 }, label: 'End' }
      ],
      edges: [
        { source: nodeIds[0], target: nodeIds[1], label: 'forward' },
        { source: nodeIds[1], target: nodeIds[2], label: 'forward' },
        { source: nodeIds[2], target: nodeIds[3], label: 'Manager Approved' },
        { source: nodeIds[2], target: nodeIds[5], label: 'Manager Rejected' },
        { source: nodeIds[3], target: nodeIds[4], label: 'HR Approved' },
        { source: nodeIds[3], target: nodeIds[5], label: 'HR Rejected' },
        { source: nodeIds[4], target: nodeIds[6], label: 'forward' },
        { source: nodeIds[5], target: nodeIds[6], label: 'forward' }
      ]
    };
  };

  const generateBasicApproval = (analysis, workflowPrompt) => {
    const startId = uuidv4();
    const validateId = uuidv4();
    const decisionId = uuidv4();
    const approvedId = uuidv4();
    const rejectedId = uuidv4();
    const endId = uuidv4();
    
    return {
      workflowName: 'Basic Approval Workflow',
      nodes: [
        { id: startId, type: 'start', position: { x: 50, y: 200 }, label: 'Start' },
        { id: validateId, type: 'action', position: { x: 250, y: 200 }, label: 'Validate Request' },
        { id: decisionId, type: 'decision', position: { x: 450, y: 200 }, label: 'Approve?' },
        { id: approvedId, type: 'action', position: { x: 650, y: 100 }, label: 'Process Approved' },
        { id: rejectedId, type: 'action', position: { x: 650, y: 300 }, label: 'Send Rejection' },
        { id: endId, type: 'end', position: { x: 850, y: 200 }, label: 'End' }
      ],
      edges: [
        { source: startId, target: validateId, label: 'forward' },
        { source: validateId, target: decisionId, label: 'forward' },
        { source: decisionId, target: approvedId, label: 'Yes' },
        { source: decisionId, target: rejectedId, label: 'No' },
        { source: approvedId, target: endId, label: 'forward' },
        { source: rejectedId, target: endId, label: 'forward' }
      ]
    };
  };

  // 👥 HR Workflow Generator
  const generateHRWorkflow = (analysis, workflowPrompt) => {
    const lower = workflowPrompt.toLowerCase();
    
    if (lower.includes('leave') || lower.includes('vacation')) {
      return generateLeaveWorkflow(analysis, workflowPrompt);
    }
    if (lower.includes('onboard') || lower.includes('hiring')) {
      return generateOnboardingWorkflow(analysis, workflowPrompt);
    }
    
    return generateGenericHRWorkflow(analysis, workflowPrompt);
  };

  const generateLeaveWorkflow = (analysis, workflowPrompt) => {
    const startId = uuidv4();
    const checkId = uuidv4();
    const reviewId = uuidv4();
    const processApprovalId = uuidv4(); // New action node
    const extendedId = uuidv4();
    const hrReviewId = uuidv4();
    const approveId = uuidv4();
    const rejectId = uuidv4();
    const endId = uuidv4();
    
    return {
      workflowName: 'Employee Leave Request Process',
      nodes: [
        { id: startId, type: 'start', position: { x: 50, y: 200 }, label: 'Employee Submits Leave' },
        { id: checkId, type: 'action', position: { x: 250, y: 200 }, label: 'Check Team Availability' },
        { id: reviewId, type: 'decision', position: { x: 450, y: 200 }, label: 'Manager Review' },
        { id: processApprovalId, type: 'action', position: { x: 650, y: 150 }, label: 'Process Approval' },
        { id: extendedId, type: 'decision', position: { x: 850, y: 150 }, label: 'Extended Leave?' },
        { id: hrReviewId, type: 'action', position: { x: 1050, y: 100 }, label: 'HR Review Required' },
        { id: approveId, type: 'action', position: { x: 1050, y: 200 }, label: 'Auto-Approve' },
        { id: rejectId, type: 'action', position: { x: 650, y: 300 }, label: 'Send Rejection' },
        { id: endId, type: 'end', position: { x: 1250, y: 200 }, label: 'End' }
      ],
      edges: [
        { source: startId, target: checkId, label: 'forward' },
        { source: checkId, target: reviewId, label: 'forward' },
        { source: reviewId, target: processApprovalId, label: 'Approved' },
        { source: reviewId, target: rejectId, label: 'Rejected' },
        { source: processApprovalId, target: extendedId, label: 'forward' },
        { source: extendedId, target: hrReviewId, label: 'Yes (>5 days)' },
        { source: extendedId, target: approveId, label: 'No' },
        { source: hrReviewId, target: endId, label: 'forward' },
        { source: approveId, target: endId, label: 'forward' },
        { source: rejectId, target: endId, label: 'forward' }
      ]
    };
  };

  const generateOnboardingWorkflow = (analysis, workflowPrompt) => {
    const startId = uuidv4();
    const hrSetupId = uuidv4();
    const setupCompleteId = uuidv4();
    const trainingId = uuidv4();
    const completionCheckId = uuidv4();
    const followUpId = uuidv4();
    const endId = uuidv4();
    
    return {
      workflowName: 'Employee Onboarding Process',
      nodes: [
        { id: startId, type: 'start', position: { x: 50, y: 200 }, label: 'New Hire Confirmed' },
        { id: hrSetupId, type: 'action', position: { x: 250, y: 200 }, label: 'HR & IT Setup' },
        { id: setupCompleteId, type: 'decision', position: { x: 450, y: 200 }, label: 'Setup Complete?' },
        { id: trainingId, type: 'action', position: { x: 650, y: 150 }, label: 'Schedule Training' },
        { id: completionCheckId, type: 'decision', position: { x: 850, y: 200 }, label: 'Training Complete?' },
        { id: followUpId, type: 'action', position: { x: 650, y: 300 }, label: 'Follow Up Setup' },
        { id: endId, type: 'end', position: { x: 1050, y: 200 }, label: 'Onboarding Complete' }
      ],
      edges: [
        { source: startId, target: hrSetupId, label: 'forward' },
        { source: hrSetupId, target: setupCompleteId, label: 'forward' },
        { source: setupCompleteId, target: trainingId, label: 'Yes' },
        { source: setupCompleteId, target: followUpId, label: 'No' },
        { source: trainingId, target: completionCheckId, label: 'forward' },
        { source: completionCheckId, target: endId, label: 'Yes' },
        { source: completionCheckId, target: followUpId, label: 'No' },
        { source: followUpId, target: setupCompleteId, label: 'retry' }
      ]
    };
  };

  const generateGenericHRWorkflow = (analysis, workflowPrompt) => {
    const startId = uuidv4();
    const reviewId = uuidv4();
    const decisionId = uuidv4();
    const processId = uuidv4();
    const endId = uuidv4();
    
    return {
      workflowName: 'HR Process Workflow',
      nodes: [
        { id: startId, type: 'start', position: { x: 50, y: 200 }, label: 'HR Request Submitted' },
        { id: reviewId, type: 'action', position: { x: 250, y: 200 }, label: 'HR Review' },
        { id: decisionId, type: 'decision', position: { x: 450, y: 200 }, label: 'Approve Request?' },
        { id: processId, type: 'action', position: { x: 650, y: 150 }, label: 'Process & Notify' },
        { id: endId, type: 'end', position: { x: 850, y: 200 }, label: 'End' }
      ],
      edges: [
        { source: startId, target: reviewId, label: 'forward' },
        { source: reviewId, target: decisionId, label: 'forward' },
        { source: decisionId, target: processId, label: 'Approved' },
        { source: decisionId, target: endId, label: 'Rejected' },
        { source: processId, target: endId, label: 'forward' }
      ]
    };
  };

  // 💰 Finance Workflow Generator
  const generateFinanceWorkflow = (analysis, workflowPrompt) => {
    const startId = uuidv4();
    const validateId = uuidv4();
    const budgetCheckId = uuidv4();
    const approvalId = uuidv4();
    const reviewRejectId = uuidv4(); // New action node
    const alternativeId = uuidv4();
    const proposeId = uuidv4();
    const endId = uuidv4();
    
    return {
      workflowName: 'Financial Process Workflow',
      nodes: [
        { id: startId, type: 'start', position: { x: 50, y: 200 }, label: 'Submit Financial Request' },
        { id: validateId, type: 'action', position: { x: 250, y: 200 }, label: 'Validate Documentation' },
        { id: budgetCheckId, type: 'decision', position: { x: 450, y: 200 }, label: 'Budget Check' },
        { id: approvalId, type: 'action', position: { x: 650, y: 100 }, label: 'Finance Approval' },
        { id: reviewRejectId, type: 'action', position: { x: 650, y: 250 }, label: 'Review Rejection' },
        { id: alternativeId, type: 'decision', position: { x: 850, y: 250 }, label: 'Alternative Options?' },
        { id: proposeId, type: 'action', position: { x: 1050, y: 300 }, label: 'Propose Alternatives' },
        { id: endId, type: 'end', position: { x: 1250, y: 200 }, label: 'End' }
      ],
      edges: [
        { source: startId, target: validateId, label: 'forward' },
        { source: validateId, target: budgetCheckId, label: 'forward' },
        { source: budgetCheckId, target: approvalId, label: 'Within Budget' },
        { source: budgetCheckId, target: reviewRejectId, label: 'Over Budget' },
        { source: approvalId, target: endId, label: 'forward' },
        { source: reviewRejectId, target: alternativeId, label: 'forward' },
        { source: alternativeId, target: proposeId, label: 'Yes' },
        { source: alternativeId, target: endId, label: 'No - Reject' },
        { source: proposeId, target: endId, label: 'forward' }
      ]
    };
  };

  // 🔧 Dynamic Workflow Generator (Ultimate Fallback)
  const generateDynamicWorkflow = (analysis, workflowPrompt) => {
    const workflowName = workflowPrompt.charAt(0).toUpperCase() + workflowPrompt.slice(1).substring(0, 50);
    const startId = uuidv4();
    const processId = uuidv4();
    const decisionId = uuidv4();
    const actionId = uuidv4();
    const endId = uuidv4();
    
    // Generate workflow based on analysis
    const startLabel = 'Start';
    const processLabel = analysis.processes.includes('submit') ? 'Submit Request' : 'Initial Processing';
    const decisionLabel = analysis.hasDecisions ? 'Review & Decide' : 'Validate Request';
    const actionLabel = analysis.actors.length > 0 ? 
      `Route to ${analysis.actors[0].charAt(0).toUpperCase() + analysis.actors[0].slice(1)}` : 
      'Process Request';
    
    return {
      workflowName,
      nodes: [
        { id: startId, type: 'start', position: { x: 50, y: 200 }, label: startLabel },
        { id: processId, type: 'action', position: { x: 250, y: 200 }, label: processLabel },
        { id: decisionId, type: 'decision', position: { x: 450, y: 200 }, label: decisionLabel },
        { id: actionId, type: 'action', position: { x: 650, y: 150 }, label: actionLabel },
        { id: endId, type: 'end', position: { x: 850, y: 200 }, label: 'End' }
      ],
      edges: [
        { source: startId, target: processId, label: 'forward' },
        { source: processId, target: decisionId, label: 'forward' },
        { source: decisionId, target: actionId, label: 'Approved' },
        { source: decisionId, target: endId, label: 'Rejected' },
        { source: actionId, target: endId, label: 'forward' }
      ]
    };
  };
  */

  // 🚀 Handle Generate Button Click
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a workflow description');
      return;
    }

    if (onGenerationStart) {
      onGenerationStart();
    }

    const result = await generateWorkflowWithAI(prompt);
    
    if (result) {
      setLastGenerated(result);
      console.log('📈 Generated workflow:', result);
      
      if (onWorkflowGenerated) {
        onWorkflowGenerated(result);
      }
      
      // Close modal after successful generation
      if (onClose) {
        setTimeout(() => onClose(), 1000);
      }
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 2 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <AutoAwesome color="primary" />
        <Typography variant="h5" component="h2" fontWeight="bold">
          Workflow Generator
        </Typography>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Sample Prompts - Disabled */}
      <Typography variant="subtitle2" color="text.disabled" mb={1}>
        Example workflows (unlock by saving details):
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={1} mb={3}>
        {samplePrompts.map((sample, index) => (
          <Chip
            key={index}
            label={sample}
            variant="outlined"
            size="small"
            disabled
            sx={{ cursor: 'not-allowed' }}
          />
        ))}
      </Box>

      {/* Main Input */}
      <TextField
        fullWidth
        multiline
        rows={3}
        label="Workflow generation locked"
        placeholder="💡 Save your profile details to unlock AI workflow generation..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled
        sx={{ mb: 3 }}
      />

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Success Display */}
      {lastGenerated && !isGenerating && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Generated &quot;{lastGenerated.workflowName}&quot; with {lastGenerated.nodes?.length || 0} nodes
        </Alert>
      )}

      {/* Action Buttons */}
      <Box display="flex" gap={2} justifyContent="flex-end">
        <Button variant="outlined" onClick={onClose} disabled={isGenerating}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={isGenerating ? <CircularProgress size={16} color="inherit" /> : <Psychology />}
          onClick={handleGenerate}
          disabled
        >
          💡 Save Details to Unlock
        </Button>
      </Box>

      {/* AI Info */}
      <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
        <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
          <Speed fontSize="small" />
          � Save details to unlock AI workflow generation
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
          ⚠️ Workflow generation is currently disabled - complete your profile to access AI features
        </Typography>
      </Box>
    </Paper>
  );
};

export default AIWorkflowGenerator;
