#!/usr/bin/env node
/**
 * Script to assign workspace_id to a user
 * Usage: node scripts/assign-workspace.js
 */

import readline from 'readline';
import pool from '../db.js';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

async function main() {
    try {
        // Show available workspaces
        console.log('\n📦 Tilgængelige workspaces:\n');
        const { rows: workspaces } = await pool.query('SELECT id, name, type FROM workspaces ORDER BY name');
        workspaces.forEach((ws, i) => {
            console.log(`  ${i + 1}. ${ws.name} (${ws.type}) - ${ws.id}`);
        });

        // Ask for workspace selection
        const wsChoice = await question('\nVælg workspace nummer (1 eller 2): ');
        const wsIndex = parseInt(wsChoice, 10) - 1;
        if (wsIndex < 0 || wsIndex >= workspaces.length) {
            console.error('❌ Ugyldigt valg');
            process.exit(1);
        }
        const selectedWorkspace = workspaces[wsIndex];

        // Show users without workspace or ask for specific user
        console.log('\n👤 Brugere:\n');
        const { rows: users } = await pool.query(`
      SELECT id, email, name, workspace_id 
      FROM users 
      ORDER BY email
    `);
        users.forEach((u, i) => {
            const wsStatus = u.workspace_id ? '✅' : '❌';
            console.log(`  ${i + 1}. ${wsStatus} ${u.email} (${u.name || 'Ukendt'})`);
        });

        const userChoice = await question('\nVælg bruger nummer (eller "all" for alle uden workspace): ');

        if (userChoice.toLowerCase() === 'all') {
            // Update all users without workspace
            const { rowCount } = await pool.query(
                'UPDATE users SET workspace_id = $1 WHERE workspace_id IS NULL',
                [selectedWorkspace.id]
            );
            console.log(`\n✅ Opdateret ${rowCount} brugere til "${selectedWorkspace.name}"`);
        } else {
            const userIndex = parseInt(userChoice, 10) - 1;
            if (userIndex < 0 || userIndex >= users.length) {
                console.error('❌ Ugyldigt valg');
                process.exit(1);
            }
            const selectedUser = users[userIndex];

            await pool.query(
                'UPDATE users SET workspace_id = $1 WHERE id = $2',
                [selectedWorkspace.id, selectedUser.id]
            );
            console.log(`\n✅ Opdateret "${selectedUser.email}" til "${selectedWorkspace.name}"`);
        }

        console.log('\n💡 Husk: Brugeren skal logge ud og ind igen for at få ny JWT med workspaceId.\n');

    } catch (error) {
        console.error('❌ Fejl:', error.message);
    } finally {
        rl.close();
        await pool.end();
    }
}

main();
